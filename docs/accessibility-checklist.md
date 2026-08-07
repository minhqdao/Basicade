# Accessibility test checklist

Run this checklist before releasing a change to the terminal's semantics,
focus behavior, or input layout. Test with a real keyboard and the named screen
reader; browser automation does not replace these checks.

## VoiceOver on macOS and iOS

- Start VoiceOver before opening Basicade in Safari.
- Confirm the page is announced as “Basicade — Classic BASIC Games” and exposes
  the Game launcher and Game terminal regions.
- Navigate to Game and Interpreter. Change each selection and confirm the new
  page identifies the selected values.
- Navigate through the Game terminal and confirm its existing output can be
  read without the whole transcript being announced after every update.
- Confirm the input is announced as “Game command input” with the short usage
  instructions, then enter an answer and press Enter.
- Activate Restart game and confirm focus returns to Game command input when
  the restarted game asks for input.
- On iOS, repeat input and restart checks in portrait and landscape.

## NVDA on Windows

- Start NVDA before opening Basicade in Firefox and Chrome.
- Confirm the page heading, Game launcher, controls, status, and Game terminal
  are named and navigable in browse mode.
- Change Game and Interpreter using only the keyboard and confirm the selected
  values after navigation.
- Read earlier and newly appended terminal output. Confirm updates do not cause
  NVDA to repeat the complete transcript.
- Switch to focus mode at “Game command input”, enter an answer, and press
  Enter. Confirm typed text and subsequent game output remain understandable.
- Activate Restart game using only the keyboard and confirm focus returns to
  Game command input when input is requested.

## Record the result

Record the operating system, screen-reader version, browser version, failures,
and any deliberate exceptions in the pull request or release notes.
