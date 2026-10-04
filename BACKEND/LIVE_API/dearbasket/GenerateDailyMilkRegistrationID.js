/**
 * Generate the transid code for a given sequence number.
 * 
 * Prefixes:  A–Z  
 * Suffixes:  z→a  
 * Letters:   a–z  
 * Constant:  369  
 * 
 * Total codes: 26 (suffixes) × 26 (prefixes) × 26 (letters) = 17 576
 * 
 * Sequence layout:
 *  1  → A-az369
 *  26 → A-zz369
 *  27 → B-az369
 *  …
 *  676 → Z-zz369
 *  677 → A-ay369
 *  …
 *  17 576 → Z-za369
 *
 * @param {number} seq  1-based sequence number
 * @returns {string|null}  the generated code, or null if seq is invalid
 */
function genTransId(seq) {
  const prefixes  = Array.from({length: 26}, (_, i) => String.fromCharCode('A'.charCodeAt(0) + i));
  const suffixes  = Array.from({length: 26}, (_, i) => String.fromCharCode('z'.charCodeAt(0) - i));
  const lettersCnt = 26;
  const prefixCnt  = prefixes.length;    // 26
  const suffixCnt  = suffixes.length;    // 26
  const blockSize  = prefixCnt * lettersCnt;      // 26 * 26 = 676
  const maxSeq     = suffixCnt * blockSize;       // 26 * 676 = 17 576

  if (!Number.isInteger(seq) || seq < 1 || seq > maxSeq) {
    return null;
  }

  const zeroSeq     = seq - 1;
  const suffixIdx   = Math.floor(zeroSeq / blockSize);
  const prefixIdx   = Math.floor((zeroSeq % blockSize) / lettersCnt);
  const letterIdx   = zeroSeq % lettersCnt;

  const prefix = prefixes[prefixIdx];
  const suffix = suffixes[suffixIdx];
  const letter = String.fromCharCode('a'.charCodeAt(0) + letterIdx);

  return `${prefix}-${letter}${suffix}369`;
}

// --- Example usage:
// console.log(genTransId(1));       // "A-az369"
// console.log(genTransId(26));      // "A-zz369"
// console.log(genTransId(27));      // "B-az369"
// console.log(genTransId(676));     // "Z-zz369"
// console.log(genTransId(677));     // "A-ay369"
// console.log(genTransId(17576));   // "Z-za369"

// for (let i = 0; i < 500; i++) {
//   console.log(genTransId(i)) 
// }

// Export for use in other modules:
module.exports = genTransId;
