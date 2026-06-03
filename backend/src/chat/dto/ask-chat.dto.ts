import { IsString, MaxLength, MinLength } from 'class-validator';

export class AskChatDto {
  // Max 300 chars is a soft cap to keep tokens predictable when the message
  // falls through to the LLM. The chat service additionally strips control
  // chars and refuses obvious prompt-injection patterns before matching.
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  message: string;
}
