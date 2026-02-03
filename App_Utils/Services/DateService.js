

function NowInIST() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // +05:30
  return new Date(now.getTime() + istOffsetMs);
}

export default NowInIST; // ✅ Ensure this export
