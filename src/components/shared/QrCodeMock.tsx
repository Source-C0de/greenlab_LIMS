export function QrCodeMock({ value, size = 120 }: { value: string; size?: number }) {
  // A simple deterministic way to generate a mock QR pattern from a string
  const hash = Array.from(value).reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  
  // Create a 5x5 grid of blocks (plus the 3 corner finders)
  const gridSize = 5;
  const blocks = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      // Skip the 3 corners for finder patterns
      if ((i === 0 && j === 0) || (i === 0 && j === gridSize - 1) || (i === gridSize - 1 && j === 0)) {
        continue;
      }
      
      // Pseudo-random based on hash and position
      const isFilled = ((hash ^ (i * 17 + j * 31)) % 3) === 0;
      blocks.push({ i, j, isFilled });
    }
  }

  const rectSize = size / (gridSize + 2); // +2 for padding

  return (
    <div 
      className="bg-white p-2 rounded-md border border-gray-200 inline-block"
      style={{ width: size, height: size }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${gridSize + 2} ${gridSize + 2}`}>
        {/* Top-Left Finder */}
        <rect x="0.5" y="0.5" width="2" height="2" fill="none" stroke="black" strokeWidth="0.5" />
        <rect x="1" y="1" width="1" height="1" fill="black" />
        
        {/* Top-Right Finder */}
        <rect x={gridSize - 0.5} y="0.5" width="2" height="2" fill="none" stroke="black" strokeWidth="0.5" />
        <rect x={gridSize} y="1" width="1" height="1" fill="black" />
        
        {/* Bottom-Left Finder */}
        <rect x="0.5" y={gridSize - 0.5} width="2" height="2" fill="none" stroke="black" strokeWidth="0.5" />
        <rect x="1" y={gridSize} width="1" height="1" fill="black" />

        {/* Data Blocks */}
        {blocks.map((block, idx) => block.isFilled && (
          <rect 
            key={idx} 
            x={block.j + 1} 
            y={block.i + 1} 
            width="1" 
            height="1" 
            fill="black" 
          />
        ))}
      </svg>
    </div>
  );
}
