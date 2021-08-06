% STL2600 + DC314: Lava Lamp RNG
% https://github.com/STL2600/Webcam-RNG


# Randomness

Defined as "Randomness is the apparent or actual lack of pattern or predictability in events."

## Different Kinds of Randomness

- "True" Random
- Statistically Random
- Pseudo Random
- Cryptographically Random



# "True" Random

Individual random events are unpredictable.

The probability, the likeliness of the outcome, is predictable



## Examples

- Coin Flip
- Dice Roll
- Hardware RNGs



# Statistically Random

A numeric sequence is statistically random when it contains no recognizable patterns or regularities.

## Examples

- Roll of a single die (as oppose to multiple dice)
- Digits of pi




# Pseudo Random

A completely deterministic and repeatable process that produces a sequence of numbers that appeaers to be patternless.

## Examples

- TOTP Passcodes (e.g. Google Auth)
- RANDU
- Mersenne Twister / MT19937
- https://en.wikipedia.org/wiki/List_of_random_number_generators



# Cryptographically Secure Pseudorandom Number Generators (CSPRNG)

For a PRNG to be considered suitable for use with cryptography:
- Must pass the "next-bit test"
- Withstand "State Compromise Extensions"

## Examples

- Cryptographic hashes
- Blum Blum Shub
- ChaCha20 (In modern BSD's and Linux)



# Testing Randomness

# Lava Lamps as RNGs

## SGI's LavaRand

## Cloudflare's "Wall of Entropy"

# Our Setup

## Hardware

## Software

# Our Results

## Testing Our Results

# Questions?

