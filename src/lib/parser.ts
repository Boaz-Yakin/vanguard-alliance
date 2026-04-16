/**
 * VANGUARD Order Engine: Deterministic Regex Parser
 * Refined for Korean contexts and messy inputs.
 */

export interface ParsedItem {
  id: string;
  name: string;
  quantity: string;
}

export const parseOrderText = (text: string): ParsedItem[] => {
  if (!text || !text.trim()) return [];

  // Split by newlines or commas
  const segments = text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  
  return segments.map((seg, index) => {
    /**
     * Strategic Regex:
     * 1. (.*?) - Item Name (Lazy match)
     * 2. \s* - Optional whitespace
     * 3. (\d+(?:\.\d+)?) - Number (Integer or Decimal)
     * 4. \s* - Optional whitespace
     * 5. ([a-zA-Z가-힣]*) - Unit (Optional: pack, kg, 팩, 망, 개, etc.)
     * This follows the [Name Order] [Quantity] convention.
     */
    const forwardRegex = /^(.*?)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z가-힣]*)$/;
    
    /**
     * Inverse Regex:
     * 1. (\d+(?:\.\d+)?) - Number
     * 2. \s* - Optional whitespace
     * 3. ([a-zA-Z가-힣]*) - Unit
     * 4. \s* - Optional whitespace
     * 5. (.*) - Item Name
     */
    const inverseRegex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z가-힣]*)\s*(.*)$/;

    const fMatch = seg.match(forwardRegex);
    if (fMatch && fMatch[1].trim()) {
      return { 
        id: `it-${index}-${Date.now()}`, 
        name: fMatch[1].trim(), 
        quantity: `${fMatch[2]}${fMatch[3]}` 
      };
    }

    const iMatch = seg.match(inverseRegex);
    if (iMatch && iMatch[3].trim()) {
      return { 
        id: `it-${index}-${Date.now()}`, 
        name: iMatch[3].trim(), 
        quantity: `${iMatch[1]}${iMatch[2]}` 
      };
    }

    // Fallback: Use the whole segment as the name
    return { 
      id: `it-${index}-${Date.now()}`, 
      name: seg, 
      quantity: "1" 
    };
  });
};
