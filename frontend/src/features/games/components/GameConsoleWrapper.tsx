import React, { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import Phaser from 'phaser';
import { useAuthStore } from '../../auth/store/authStore';
import { MissionProgressOverlay } from './MissionProgressOverlay';

type GameConsoleWrapperProps = {
  title: string;
  description: string;
  objective: string;
  controlsPc: string[];
  controlsMobile: string[];
  hasGamepad: boolean;
  phaserGameRef: React.MutableRefObject<Phaser.Game | null>;
  // React 19's useRef<HTMLDivElement>(null) widens to T | null.
  gameRef: RefObject<HTMLDivElement | null>;
  gameStarted: boolean;
  setGameStarted: (val: boolean) => void;
  onQuit: () => void;
  children?: React.ReactNode;
};

export const GameConsoleWrapper: React.FC<GameConsoleWrapperProps> = ({
  title,
  description,
  objective,
  controlsPc,
  controlsMobile,
  hasGamepad,
  phaserGameRef,
  gameRef,
  gameStarted,
  setGameStarted,
  onQuit,
  children,
}) => {
  // Surface the role so the wrapper can show a "preview mode" banner when
  // a teacher opens a game directly from the catalog. The flag is purely
  // visual — it doesn't gate anything in the scene.
  const role = useAuthStore((state) => state.user?.role);
  const isTeacherPreview = role === 'TEACHER';

  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBtnAPressed, setIsBtnAPressed] = useState(false);
  const [isBtnBPressed, setIsBtnBPressed] = useState(false);

  const [joystickState, setJoystickState] = useState({
    active: false,
    baseX: 0,
    baseY: 0,
    stickX: 0,
    stickY: 0,
  });

  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const activeKeysRef = useRef({ left: false, right: false, up: false, down: false });

  // Initialize global virtual joystick object
  useEffect(() => {
    (window as any).virtualJoystick = {
      active: false,
      dx: 0,
      dy: 0,
      intensity: 0,
    };
    return () => {
      delete (window as any).virtualJoystick;
    };
  }, []);

  // Block ALL browser scroll, zoom, pull-to-refresh and text selection during gameplay
  useEffect(() => {
    if (!gameStarted) return;

    const html = document.documentElement;
    const body = document.body;

    // Save original styles
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = body.style.overflow;
    const origHtmlTouchAction = html.style.touchAction;
    const origBodyTouchAction = body.style.touchAction;
    const origOverscroll = body.style.overscrollBehavior;
    const origUserSelect = body.style.userSelect;
    const origWebkitUserSelect = (body.style as any).webkitUserSelect;

    // Lock body
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.touchAction = 'none';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'none';
    body.style.userSelect = 'none';
    (body.style as any).webkitUserSelect = 'none';
    html.style.position = 'fixed';
    html.style.width = '100%';
    html.style.height = '100%';

    // Prevent default on touchmove globally to stop scroll/zoom
    const blockTouch = (e: TouchEvent) => {
      // Allow touches inside question modals (pointerdown on Phaser canvas)
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', blockTouch, { passive: false });

    // Prevent pinch-zoom via gesturestart (Safari)
    const blockGesture = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', blockGesture, { passive: false } as any);
    document.addEventListener('gesturechange', blockGesture, { passive: false } as any);

    // Set viewport meta to prevent zoom
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    const origViewportContent = viewportMeta?.content || '';
    if (viewportMeta) {
      viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    }

    return () => {
      html.style.overflow = origHtmlOverflow;
      body.style.overflow = origBodyOverflow;
      html.style.touchAction = origHtmlTouchAction;
      body.style.touchAction = origBodyTouchAction;
      body.style.overscrollBehavior = origOverscroll;
      body.style.userSelect = origUserSelect;
      (body.style as any).webkitUserSelect = origWebkitUserSelect;
      html.style.position = '';
      html.style.width = '';
      html.style.height = '';

      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);

      if (viewportMeta) {
        viewportMeta.content = origViewportContent;
      }
    };
  }, [gameStarted]);

  const updateJoystickGlobalAndKeys = (dx: number, dy: number, distance: number, maxRadius: number) => {
    const normalX = dx / maxRadius;
    const normalY = dy / maxRadius;
    const intensity = Math.min(distance / maxRadius, 1);

    (window as any).virtualJoystick = {
      active: true,
      dx: normalX,
      dy: normalY,
      intensity: intensity,
    };

    // Keyboard emulation transitions
    const deadzone = 0.25;
    const keys = {
      left: normalX < -deadzone,
      right: normalX > deadzone,
      up: normalY < -deadzone,
      down: normalY > deadzone,
    };

    const activeKeys = activeKeysRef.current;

    if (keys.left !== activeKeys.left) {
      simulateKey('ArrowLeft', 'ArrowLeft', 37, keys.left ? 'keydown' : 'keyup');
      activeKeys.left = keys.left;
    }
    if (keys.right !== activeKeys.right) {
      simulateKey('ArrowRight', 'ArrowRight', 39, keys.right ? 'keydown' : 'keyup');
      activeKeys.right = keys.right;
    }
    if (keys.up !== activeKeys.up) {
      simulateKey('ArrowUp', 'ArrowUp', 38, keys.up ? 'keydown' : 'keyup');
      activeKeys.up = keys.up;
    }
    if (keys.down !== activeKeys.down) {
      simulateKey('ArrowDown', 'ArrowDown', 40, keys.down ? 'keydown' : 'keyup');
      activeKeys.down = keys.down;
    }
  };

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = phaserGameRef.current?.canvas;
    if (canvas) canvas.focus();

    const rect = joystickAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const baseX = rect.width / 2;
    const baseY = rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let dx = localX - baseX;
    let dy = localY - baseY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = 40;

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickState({
      active: true,
      baseX,
      baseY,
      stickX: dx,
      stickY: dy,
    });

    updateJoystickGlobalAndKeys(dx, dy, distance, maxRadius);

    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(15); } catch { /* ignore */ }
    }
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickState.active) return;
    e.preventDefault();

    const rect = joystickAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const baseX = rect.width / 2;
    const baseY = rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      if (e.buttons !== 1) {
        handleJoystickEnd(e);
        return;
      }
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let dx = localX - baseX;
    let dy = localY - baseY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = 40;

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickState((prev) => ({
      ...prev,
      stickX: dx,
      stickY: dy,
    }));

    updateJoystickGlobalAndKeys(dx, dy, distance, maxRadius);
  };

  const handleJoystickEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!joystickState.active) return;

    setJoystickState({
      active: false,
      baseX: 0,
      baseY: 0,
      stickX: 0,
      stickY: 0,
    });

    (window as any).virtualJoystick = {
      active: false,
      dx: 0,
      dy: 0,
      intensity: 0,
    };

    const activeKeys = activeKeysRef.current;
    if (activeKeys.left) { simulateKey('ArrowLeft', 'ArrowLeft', 37, 'keyup'); activeKeys.left = false; }
    if (activeKeys.right) { simulateKey('ArrowRight', 'ArrowRight', 39, 'keyup'); activeKeys.right = false; }
    if (activeKeys.up) { simulateKey('ArrowUp', 'ArrowUp', 38, 'keyup'); activeKeys.up = false; }
    if (activeKeys.down) { simulateKey('ArrowDown', 'ArrowDown', 40, 'keyup'); activeKeys.down = false; }
  };

  // Detect mobile device viewport size and touch capabilities
  useEffect(() => {
    const checkDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmall = window.innerWidth < 768;
      setIsMobile(isSmall || isTouch);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Handle global Escape key to pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!gameStarted) return;
        if (isPaused) {
          handleResume();
        } else {
          handlePause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, isPaused]);

  // Lock scroll, gestures, and zoom when game starts and is not paused
  useEffect(() => {
    if (!gameStarted || isPaused) return;

    // 1. Prevent default document touchmove to disable mobile scroll bounce/pull-to-refresh
    const preventTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    // 2. Lock body and html overflow/positioning. Cleanup resets to ''
    // (the canonical "unset" for style.*) so we don't need to snapshot
    // the previous values.
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';

    // 3. Prevent page scaling/zoom via viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const originalViewportContent = viewportMeta ? viewportMeta.getAttribute('content') : '';
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    return () => {
      document.removeEventListener('touchmove', preventTouchMove);
      
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.touchAction = '';

      if (viewportMeta && originalViewportContent) {
        viewportMeta.setAttribute('content', originalViewportContent);
      }
    };
  }, [gameStarted, isPaused]);

  const handleStart = () => {
    setGameStarted(true);
  };

  const handlePause = () => {
    setIsPaused(true);
    if (phaserGameRef.current) {
      phaserGameRef.current.scene.scenes.forEach((scene) => {
        if (scene.scene.isActive()) {
          scene.scene.pause();
        }
      });
      phaserGameRef.current.sound.pauseAll();
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    if (phaserGameRef.current) {
      phaserGameRef.current.scene.scenes.forEach((scene) => {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
        }
      });
      phaserGameRef.current.sound.resumeAll();
    }
  };

  const handleRestart = () => {
    setIsPaused(false);
    if (phaserGameRef.current) {
      const game = phaserGameRef.current;
      const sceneManager = game.scene;
      
      // Stop all registered scenes
      sceneManager.scenes.forEach((scene) => {
        sceneManager.stop(scene.scene.key);
      });
      
      // Stop all audio
      game.sound.stopAll();
      game.sound.resumeAll();

      // Reset registry but preserve target level questions
      const questions = game.registry.get('preguntasDelNivel');
      game.registry.reset();
      if (questions) {
        game.registry.set('preguntasDelNivel', questions);
      }

      // Start the very first scene in the list (Boot/Preloader/MainMenu) to run a clean init
      if (sceneManager.scenes.length > 0) {
        const firstSceneKey = sceneManager.scenes[0].scene.key;
        sceneManager.start(firstSceneKey);
      }
    }
  };

  // Dispatch mock keyboard events to global window object, document, and phaser canvas
  const simulateKey = (key: string, code: string, keyCode: number, type: 'keydown' | 'keyup') => {
    const createEvent = () => {
      const event = new KeyboardEvent(type, {
        key: key,
        code: code,
        bubbles: true,
        cancelable: true,
      });
      // Force correct keyCode and which properties (needed for Phaser & Chrome/Safari compatibility)
      Object.defineProperty(event, 'keyCode', { value: keyCode, enumerable: true, configurable: true, writable: true });
      Object.defineProperty(event, 'which', { value: keyCode, enumerable: true, configurable: true, writable: true });
      return event;
    };

    window.dispatchEvent(createEvent());
    document.dispatchEvent(createEvent());

    const canvas = phaserGameRef.current?.canvas;
    if (canvas) {
      canvas.dispatchEvent(createEvent());
    }
  };

  const handleActionButtonDown = (e: React.TouchEvent | React.MouseEvent, button: 'A' | 'B') => {
    e.preventDefault();
    const canvas = phaserGameRef.current?.canvas;
    if (canvas) canvas.focus();
    if (button === 'A') setIsBtnAPressed(true);
    else setIsBtnBPressed(true);
    // Both buttons fire Space AND Z so they always do the same thing
    simulateKey(' ', 'Space', 32, 'keydown');
    simulateKey('z', 'KeyZ', 90, 'keydown');
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(10); } catch { /* ignore */ }
    }
  };

  const handleActionButtonUp = (e: React.TouchEvent | React.MouseEvent, button: 'A' | 'B') => {
    e.preventDefault();
    if (button === 'A') setIsBtnAPressed(false);
    else setIsBtnBPressed(false);
    simulateKey(' ', 'Space', 32, 'keyup');
    simulateKey('z', 'KeyZ', 90, 'keyup');
  };

  const renderInstructionsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 select-none" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
      <div 
        className="relative border-8 border-on-background bg-surface-container-lowest p-6 shadow-[12px_12px_0_0_#1d1c17] text-on-surface-container flex flex-col justify-between overflow-y-auto"
        style={{ width: '90%', maxWidth: '520px', minWidth: '280px', maxHeight: '95vh', boxSizing: 'border-box' }}
      >
        <div>
          {isTeacherPreview && (
            <div className="mb-3 border-4 border-tertiary bg-tertiary-container px-2 py-1 text-center font-mono text-xs font-bold uppercase text-on-tertiary-container">
              Modo previsualización · no cuenta como tarea
            </div>
          )}
          <h1 className="border-b-4 border-on-background pb-2 text-2xl md:text-3xl font-black uppercase tracking-widest text-center text-primary" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
            {title}
          </h1>
          
          <div className="mt-4 space-y-4 leading-relaxed">
            <div>
              <span className="font-bold text-secondary uppercase block mb-1 text-lg md:text-xl" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>¿Cómo jugar?</span>
              <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>{description}</p>
            </div>

            <div>
              <span className="font-bold text-tertiary uppercase block mb-1 text-lg md:text-xl" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>Objetivo</span>
              <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>{objective}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-on-background/25 pt-4">
              <div>
                <span className="font-bold text-on-background uppercase block mb-1 text-sm md:text-base" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>⌨ Computadora</span>
                <ul className="list-disc pl-4 text-sm md:text-base space-y-1 text-on-surface-variant" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
                  {controlsPc.map((ctrl, i) => <li key={i}>{ctrl}</li>)}
                </ul>
              </div>
              <div>
                <span className="font-bold text-on-background uppercase block mb-1 text-sm md:text-base" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>📱 Celular</span>
                <ul className="list-disc pl-4 text-sm md:text-base space-y-1 text-on-surface-variant" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
                  {controlsMobile.map((ctrl, i) => <li key={i}>{ctrl}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleStart}
            className="w-full border-4 border-on-background bg-primary px-4 py-3 text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
            style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}
          >
            Comenzar Juego
          </button>
          <button
            onClick={onQuit}
            className="w-full border-4 border-on-background bg-surface-variant px-4 py-3 text-base font-bold uppercase text-on-surface-variant shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
            style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );

  const renderPauseModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
      <div 
        className="border-8 border-on-background bg-surface-container p-6 shadow-[12px_12px_0_0_#1d1c17]"
        style={{ width: '90%', maxWidth: '380px', minWidth: '280px', boxSizing: 'border-box' }}
      >
        <h2 className="text-center font-headline text-3xl font-black uppercase tracking-widest text-error">
          Pausa
        </h2>
        
        <div className="mt-6 flex flex-col gap-4">
          <button
            onClick={handleResume}
            className="flex items-center justify-center gap-2 border-4 border-on-background bg-primary px-4 py-3 font-headline text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Continuar
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center justify-center gap-2 border-4 border-on-background bg-secondary px-4 py-3 font-headline text-base font-bold uppercase text-on-secondary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
          >
            <span className="material-symbols-outlined">replay</span>
            Reiniciar
          </button>
          <button
            onClick={onQuit}
            className="flex items-center justify-center gap-2 border-4 border-on-background bg-error px-4 py-3 font-headline text-base font-bold uppercase text-on-error shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  // Derive directional highlight states from joystick position
  const joyLeft = joystickState.stickX < -8;
  const joyRight = joystickState.stickX > 8;
  const joyUp = joystickState.stickY < -8;
  const joyDown = joystickState.stickY > 8;

  const renderGamepad = () => (
    <div className="flex h-[32vh] min-h-[180px] w-full select-none justify-around items-center bg-slate-900 px-6 md:px-24 py-4 border-t-8 border-on-background relative">
      {/* Visual background details */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
 
      {/* Joystick Area (Fixed & Always Visible) */}
      <div 
        ref={joystickAreaRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onMouseDown={handleJoystickStart}
        onMouseMove={handleJoystickMove}
        onMouseUp={handleJoystickEnd}
        onMouseLeave={handleJoystickEnd}
        className="relative flex items-center justify-center cursor-crosshair select-none"
        style={{ width: '140px', height: '140px' }}
      >
        {/* Directional indicators */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyUp ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>▲</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyDown ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>▼</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyLeft ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>◀</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyRight ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>▶</span>

        {/* Fixed Outer Base (Always visible) */}
        <div 
          className="absolute rounded-full border-4 border-slate-400/40 bg-slate-700/20 shadow-inner flex items-center justify-center"
          style={{ width: '120px', height: '120px', pointerEvents: 'none' }}
        >
          {/* Stick (inner circle, always visible, moves relative to center) */}
          <div 
            className="absolute rounded-full border-4 border-slate-950 bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
            style={{
              width: '54px',
              height: '54px',
              transform: `translate3d(${joystickState.stickX}px, ${joystickState.stickY}px, 0)`,
              transition: joystickState.active ? 'none' : 'transform 0.15s ease-out',
              pointerEvents: 'none',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-orange-300/60 shadow-inner" />
          </div>
        </div>
      </div>
 
      {/* The middle "Pausa / Start" button used to live here, but it
          duplicated the working pause icon already pinned to the top-right
          of the game canvas (line ~710) and confused testers because the
          retro-styled gamepad button looked clickable yet routed to the
          same handler. Removed for the mobile gamepad layout only — the
          desktop layout has its own dedicated pause button in the top
          action bar (line ~749) and is untouched. */}

      {/* Action Buttons A / B */}
      <div className="flex items-center gap-5 pr-1">
        {/* Button B */}
        <div className="flex flex-col items-center gap-1">
          <button
            onTouchStart={(e) => handleActionButtonDown(e, 'B')}
            onTouchEnd={(e) => handleActionButtonUp(e, 'B')}
            onMouseDown={(e) => handleActionButtonDown(e, 'B')}
            onMouseUp={(e) => handleActionButtonUp(e, 'B')}
            onMouseLeave={(e) => handleActionButtonUp(e, 'B')}
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-950 bg-[#8c1818] text-3xl font-black text-[#fca5a5] cursor-pointer transition-all duration-75"
            style={{
              transform: isBtnBPressed ? 'scale(0.9) translateY(2px)' : 'scale(1) translateY(0)',
              filter: isBtnBPressed ? 'brightness(1.25)' : 'brightness(1)',
              boxShadow: isBtnBPressed ? '1px 1px 0 0 #000' : '4px 4px 0 0 #000',
            }}
          >
            B
          </button>
        </div>
 
        {/* Button A */}
        <div className="flex flex-col items-center gap-1 -mt-10">
          <button
            onTouchStart={(e) => handleActionButtonDown(e, 'A')}
            onTouchEnd={(e) => handleActionButtonUp(e, 'A')}
            onMouseDown={(e) => handleActionButtonDown(e, 'A')}
            onMouseUp={(e) => handleActionButtonUp(e, 'A')}
            onMouseLeave={(e) => handleActionButtonUp(e, 'A')}
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-950 bg-[#c2410c] text-3xl font-black text-[#ffedd5] cursor-pointer transition-all duration-75"
            style={{
              transform: isBtnAPressed ? 'scale(0.9) translateY(2px)' : 'scale(1) translateY(0)',
              filter: isBtnAPressed ? 'brightness(1.25)' : 'brightness(1)',
              boxShadow: isBtnAPressed ? '1px 1px 0 0 #000' : '4px 4px 0 0 #000',
            }}
          >
            A
          </button>
        </div>
      </div>
    </div>
  );

  // If game is not started, show instructions
  if (!gameStarted) {
    return renderInstructionsModal();
  }

  // If game is paused, render overlay
  const pauseOverlay = isPaused ? renderPauseModal() : null;

  // On Mobile and hasGamepad configured: 70% game area + 30% retro control chassis
  // Uses `dvh` so the layout follows the dynamic viewport on mobile (the
  // URL bar appearing / disappearing) instead of getting clipped under it.
  if (isMobile && hasGamepad) {
    return (
      <div className="fixed inset-0 flex flex-col bg-slate-950 overflow-hidden select-none" style={{ touchAction: 'none' }}>
        {/* Top Game viewport (~68% of the dynamic viewport height) */}
        <div className="relative flex h-[68dvh] w-full items-center justify-center bg-black p-1">
          {/* Retro Game Frame Border */}
          <div className="relative flex h-full w-full max-w-[800px] flex-col border-4 border-slate-800 bg-black">
            {/* Retro Battery Light detail */}
            <div className="absolute left-4 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 opacity-75">
              <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <span className="font-mono text-[7px] font-bold text-red-500">BATTERY</span>
            </div>
            
            <div className="absolute right-4 top-4 z-30">
              <button
                onTouchStart={(e) => { e.preventDefault(); handlePause(); }}
                onMouseDown={(e) => { e.preventDefault(); handlePause(); }}
                className="flex items-center justify-center rounded bg-slate-900/60 p-2 text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-md">pause</span>
              </button>
            </div>

            <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center">
              {children}
              <div ref={gameRef} className="h-full w-full" />
            </div>
          </div>
        </div>

        {/* Bottom Gamepad controls (32% height) */}
        {renderGamepad()}
        {pauseOverlay}
        <MissionProgressOverlay active={gameStarted} />
      </div>
    );
  }

  // Desktop or Mobile (without gamepad - full-screen touch mode)
  //
  // Layout notes (kept here because the responsive bug history is easy to
  // re-introduce): the wrapper used to `justify-center` the whole card,
  // which on short viewports (laptops with devtools open, narrow popup
  // windows, Vercel previews on weird sizes) centered the 4:3 board
  // vertically — making the top get clipped under the absolute "Salir /
  // Pausa" bar and the bottom run past the visible area. Fix:
  //   - `justify-start` + top padding that reserves room for the buttons
  //   - `max-h-[calc(100dvh-…)]` on the board itself so it never exceeds
  //     the usable viewport regardless of aspect ratio
  //   - keep `overflow-y-auto` on the page as the safety net if the user
  //     is on a truly tiny screen
  return (
    <div className={`relative flex min-h-dvh w-full flex-col items-center justify-start bg-surface-container px-4 pb-4 pt-20 md:pt-24 md:px-8 md:pb-8 overflow-y-auto ${gameStarted ? 'select-none' : ''}`} style={{ touchAction: gameStarted ? 'none' : 'auto' }}>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container via-surface to-background opacity-50" />

      {/* Top action bar */}
      <div className="absolute left-4 top-4 z-20 flex gap-2">
        <button
          onClick={onQuit}
          className="flex items-center gap-1 border-4 border-on-background bg-surface px-4 py-2 font-headline text-sm font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Salir
        </button>
        <button
          onClick={handlePause}
          className="flex items-center gap-1 border-4 border-on-background bg-surface px-4 py-2 font-headline text-sm font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
        >
          <span className="material-symbols-outlined">pause</span>
          Pausa
        </button>
        {isTeacherPreview && (
          <div className="flex items-center gap-1 border-4 border-tertiary bg-tertiary-container px-3 py-2 font-mono text-xs font-bold uppercase text-on-tertiary-container shadow-[4px_4px_0_0_#1d1c17]">
            <span className="material-symbols-outlined text-base">visibility</span>
            Modo preview
          </div>
        )}
      </div>

      <div
        className="z-10 flex w-full flex-col border-8 border-on-background bg-surface-container-lowest shadow-[16px_16px_0_0_#1d1c17]"
        style={{ width: '90%', maxWidth: '800px', boxSizing: 'border-box' }}
      >
        <div className="flex items-center justify-center border-b-8 border-on-background bg-primary px-3 py-4 text-on-primary">
          <h2 className="flex items-center gap-2 font-headline text-2xl font-bold uppercase tracking-widest text-on-primary">
            {title}
          </h2>
        </div>

        <div className="flex w-full justify-center bg-surface-container-lowest p-3">
          {/* Main game board.
              - aspect-ratio 4:3 = the canvas Phaser scenes are built for
              - max-height clamps to (viewport − ~14rem reserved for the
                top action bar + the card title + paddings). Without this
                clamp, tall enough aspect ratio + narrow viewports clip the
                bottom of the canvas in production. `dvh` instead of `vh`
                so it follows the actual visible area on mobile (the URL
                bar appearing/disappearing).
              - `min-h-0` lets flex shrink the child when constrained by
                max-height.
              - keep `w-full` + `max-w-full` so width still adapts when
                the card is narrower than the height-derived width. */}
          <div
            className="relative min-h-0 w-full overflow-hidden rounded-md border-4 border-on-background shadow-inner bg-black"
            style={{
              aspectRatio: '4 / 3',
              maxWidth: '100%',
              maxHeight: 'calc(100dvh - 14rem)',
            }}
          >
            {children}
            <div
              ref={gameRef}
              className="absolute inset-0 z-10 flex h-full w-full items-center justify-center"
            />
          </div>
        </div>
      </div>

      {pauseOverlay}
      <MissionProgressOverlay active={gameStarted} />
    </div>
  );
};
