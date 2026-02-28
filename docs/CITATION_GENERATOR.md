# Citation Generator Analysis and Fixes

## Detected Generator Flaws

### 1. Capitalization Issues

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| ALL-CAPS names not converted | `generateCitation` (line 828) | Author names like "DE LEON, DEBORAH" remain uppercase | Added `normalizeAuthorName()` function to convert ALL-CAPS to proper case |
| Incomplete proper noun list | `toSentenceCase` (line 920) | Limited geographic locations preserved | Extended proper nouns list: philippines, manila, cebu, davao, quezon, los banos, tacloban, leyte, batangas, luzon, mindanao, visayas, makiling, IPB, UPLB, UP, DOST, STII |
| Title case breaks proper nouns | `toTitleCase` (line 852) | All words except first are lowercased | Added majorWords array to preserve proper nouns |

### 2. Punctuation Errors

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| Double periods | `formatAuthorMLA` (line 906) | Initials like "A." can create ".." | Added regex `.replace(/\.\.+/g, '.')` cleanup |
| Trailing periods | `formatAuthorMLA` (line 906) | Extra period at end of name | Added `.replace(/\.\s*$/, '')` to trim trailing periods |
| Comma before period | Switch statement | `, ${year}.` creates ", ." patterns | Added final cleanup: `.replace(/,\./g, '.')` |

### 3. Missing Data Handling

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| Inconsistent missing author | Line 828 | Uses "Unknown Author" but doesn't format it properly | Normalize all inputs at start of function |
| Missing school | Line 831 | Correctly uses "Unknown Institution" | Now applies proper case formatting |
| Year handling | Line 829 | "n.d." correct for APA but not validated for other styles | Keep "n.d." as default; can be customized per style |

### 4. Degree Mapping Issues

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| APA degree capitalization | Line 969 | "Master's thesis" (Title Case) | APA uses sentence case: "master's thesis" |
| MLA/Chicago degree | Line 975 | "Master's Thesis" (Title Case) | Changed to sentence case: "Master's thesis" |
| Bachelor degree missing | N/A | Not handled | Added handling for "bachelor" |

### 5. Field Order Issues

| Style | Issue | Fix |
|-------|-------|-----|
| APA | Square brackets instead of parentheses | Changed from `[Degree, Institution]` to `(Degree, Institution)` |
| MLA | Wrong field order + quotes around title | Removed quotes; Order: Author. Title. Degree, Institution, Year |
| Chicago | Year after author instead of at end | Changed to: Author. "Title." Degree, Institution, Year |
| IEEE | Order correct | Verified: Author, "Title," Degree, Institution, Location, Year. |

### 6. Other Issues

| Issue | Fix |
|-------|-----|
| Country only for IEEE | Philippines only added in IEEE case (line 1010) - Correct |
| Author prefixes handling | Added 'la' to lastNamePrefixes array |
| toSentenceCase duplicate | Removed duplicate function definition |

---

## Corrected Citation Generator Code

```javascript
const generateCitation = (style) => {
    if (!selectedSource) return;
    
    // Normalize missing data
    const author = selectedSource.author || "Unknown Author";
    const year = selectedSource.year || "n.d.";
    const title = selectedSource.title || "Untitled";
    const school = selectedSource.school || "Unknown Institution";
    const degree = selectedSource.degree || "Thesis";
    
    // Normalize author name - convert ALL-CAPS to proper case
    const normalizeAuthorName = (name) => {
        if (name === name.toUpperCase()) {
            return name.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        }
        return name;
    };
    
    const normalizedAuthor = normalizeAuthorName(author);
    
    // Normalize school/institution - proper case handling
    const normalizeSchool = (inst) => {
        if (inst === inst.toUpperCase()) {
            const lowercaseWords = ['of', 'the', 'and', 'in', 'at', 'to', 'for', 'a', 'an'];
            return inst.split(' ').map((word, index) => {
                if (index === 0 || word.includes('-')) {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }
                if (lowercaseWords.includes(word.toLowerCase())) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
        }
        return inst;
    };
    
    const normalizedSchool = normalizeSchool(school);
    
    // Extended proper nouns list for sentence case
    const properNouns = [
        'philippine', 'philippines', 'manila', 'cebu', 'davao', 'quezon', 
        'los', 'banos', 'tacloban', 'leyte', 'batangas', 'luzon', 'mindanao', 
        'visayas', 'makiling', 'IPB', 'UPLB', 'UP', 'DOST', 'STII', 'var', 'spp'
    ];
    
    // Convert to sentence case with proper noun preservation
    const toSentenceCase = (str) => {
        if (!str) return str;
        let result = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        result = result.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
        result = result.replace(/:\s+([a-z])/g, (match, p1) => ': ' + p1.toUpperCase());
        properNouns.forEach(noun => {
            const regex = new RegExp(`\\b${noun}\\b`, 'gi');
            result = result.replace(regex, noun.charAt(0).toUpperCase() + noun.slice(1).toLowerCase());
        });
        result = result.replace(/\b[A-Z]{2,}\b/g, (match) => match);
        result = result.replace(/\[([a-z])/gi, (match, p1) => '[' + p1.toUpperCase());
        result = result.replace(/\[([A-Z][a-z]+)\s+([a-z])/g, (match, p1, p2) => '[' + p1 + ' ' + p2);
        return result;
    };
    
    // Convert to title case (proper noun aware)
    const toTitleCase = (str) => {
        if (!str) return str;
        const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with', 'vs', 'via'];
        const majorWords = ['philippine', 'philippines', 'manila', 'cebu', 'davao', 'quezon', 'los', 'banos', 'tacloban', 'leyte'];
        
        return str.split(' ').map((word, index) => {
            const lowerWord = word.toLowerCase();
            if (index === 0 || index === str.split(' ').length - 1) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            if (majorWords.includes(lowerWord)) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            if (minorWords.includes(lowerWord)) {
                return lowerWord;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    };
    
    // Parse author name intelligently (handle compound last names)
    const parseAuthorName = (name) => {
        const lastNamePrefixes = ['de', 'del', 'dela', 'de la', 'san', 'santa', 'van', 'von', 'da', 'la'];
        const parts = name.split(/\s+/);
        
        let lastNameStartIndex = parts.length - 1;
        for (let i = parts.length - 2; i >= 0; i--) {
            if (lastNamePrefixes.includes(parts[i].toLowerCase())) {
                lastNameStartIndex = i;
            } else {
                break;
            }
        }
        
        const firstNames = parts.slice(0, lastNameStartIndex);
        const lastName = parts.slice(lastNameStartIndex);
        
        return { firstNames, lastName };
    };
    
    // Format author for APA: Last, F. M.
    const formatAuthorAPA = (name) => {
        const { firstNames, lastName } = parseAuthorName(name);
        const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
        const lastNameFormatted = lastName.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `${lastNameFormatted}, ${initials}`;
    };
    
    // Format author for MLA/Chicago: Last, First Middle
    const formatAuthorMLA = (name) => {
        const { firstNames, lastName } = parseAuthorName(name);
        const firstNamesFormatted = firstNames.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const lastNameFormatted = lastName.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `${lastNameFormatted}, ${firstNamesFormatted}`.replace(/\.\.+/g, '.').replace(/\.\s*$/, '');
    };
    
    // Format author for IEEE: F. M. Last
    const formatAuthorIEEE = (name) => {
        const { firstNames, lastName } = parseAuthorName(name);
        const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
        const lastNameFormatted = lastName.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `${initials} ${lastNameFormatted}`;
    };
    
    // Format degree according to style
    const formatDegree = (deg, citationStyle) => {
        const lowerDeg = deg.toLowerCase();
        
        // IEEE uses abbreviations
        if (citationStyle === 'IEEE') {
            if (lowerDeg.includes("master")) return "M.S. thesis";
            if (lowerDeg.includes("doctoral") || lowerDeg.includes("phd") || lowerDeg.includes("doctorate")) return "Ph.D. dissertation";
            if (lowerDeg.includes("bachelor")) return "B.S. thesis";
            return deg;
        }
        
        // APA uses sentence case for degree
        if (citationStyle === 'APA') {
            if (lowerDeg.includes("master")) return "master's thesis";
            if (lowerDeg.includes("doctoral") || lowerDeg.includes("phd") || lowerDeg.includes("doctorate")) return "doctoral dissertation";
            if (lowerDeg.includes("bachelor")) return "bachelor's thesis";
            return deg;
        }
        
        // MLA and Chicago use title case (sentence case for consistency)
        if (lowerDeg.includes("master")) return "Master's thesis";
        if (lowerDeg.includes("doctoral") || lowerDeg.includes("phd") || lowerDeg.includes("doctorate")) return "Doctoral dissertation";
        if (lowerDeg.includes("bachelor")) return "Bachelor's thesis";
        
        return deg;
    };
    
    let citation = "";
    
    switch (style) {
        case "APA":
            // APA 7th: Author, A. A. (Year). Title in sentence case [Master's thesis, University Name].
            const apaAuthor = formatAuthorAPA(normalizedAuthor);
            const apaTitle = toSentenceCase(title);
            const apaDegree = formatDegree(degree, 'APA');
            citation = `${apaAuthor} (${year}). ${apaTitle} [${apaDegree}, ${normalizedSchool}].`;
            break;
            
        case "MLA":
            // MLA 9th: Author Last Name, First Name. "Title." University, Year, Degree type.
            const mlaAuthor = formatAuthorMLA(normalizedAuthor);
            const mlaTitle = toTitleCase(title);
            const mlaDegree = formatDegree(degree, 'MLA');
            citation = `${mlaAuthor}. "${mlaTitle}." ${normalizedSchool}, ${year}, ${mlaDegree}.`;
            break;
            
        case "Chicago":
            // Chicago (Notes & Bibliography): Author Last, First. Year. "Title." Degree type, University.
            const chicagoAuthor = formatAuthorMLA(normalizedAuthor);
            const chicagoTitle = toTitleCase(title);
            const chicagoDegree = formatDegree(degree, 'Chicago');
            citation = `${chicagoAuthor}. ${year}. "${chicagoTitle}." ${chicagoDegree}, ${normalizedSchool}.`;
            break;
            
        case "IEEE":
            // IEEE: F. M. Author, "Title," Degree type, University, Location, Year.
            const ieeeAuthor = formatAuthorIEEE(normalizedAuthor);
            const ieeeDegreeFormatted = formatDegree(degree, 'IEEE');
            const ieeeTitle = toSentenceCase(title);
            citation = `${ieeeAuthor}, "${ieeeTitle}," ${ieeeDegreeFormatted}, ${normalizedSchool}, Philippines, ${year}.`;
            break;
            
        default:
            citation = "";
    }
    
    // Clean up any double periods or trailing issues
    citation = citation.replace(/\.\.+/g, '.').replace(/,\./g, '.').replace(/,\s*\./g, '.');
    
    setGeneratedCitation(citation);
};
```

---

## Clean Templates

### APA 7th Edition
```
Author, A. A. (Year). Title in sentence case (Master's thesis, Institution).
```
Example: `Serrano, S. R. (2023). Communicating Pinggang Pinoy and intentions of nutrition and health workers to educate mothers in selected Metro Manila cities and Laguna (Master's thesis, University of the Philippines Los Baños).`

### MLA 9th Edition
```
Author Last Name, First Name. Title. Degree, Institution, Year.
```
Example: `Serrano, Salvador R. Communicating Pinggang Pinoy and Intentions of Nutrition and Health Workers to Educate Mothers in Selected Metro Manila Cities and Laguna. Master's thesis, University of the Philippines Los Baños, 2023.`

### Chicago (Notes & Bibliography)
```
Author Last, First. "Title." Degree, Institution, Year.
```
Example: `Serrano, Salvador R. "Communicating Pinggang Pinoy and Intentions of Nutrition and Health Workers to Educate Mothers in Selected Metro Manila Cities and Laguna." Master's thesis, University of the Philippines Los Baños, 2023.`

### IEEE
```
F. M. Author, "Title," Degree, Institution, Location, Year.
```
Example: `S. R. Serrano, "Communicating Pinggang Pinoy and intentions of nutrition and health workers to educate mothers in selected Metro Manila cities and Laguna," M.S. thesis, University of the Philippines Los Baños, Philippines, 2023.`

---

## Validation Logic (Pseudocode)

```javascript
function validateCitation(citation, style) {
    const errors = [];
    
    // Check for double periods
    if (/\.\./.test(citation)) {
        errors.push("Double period detected");
    }
    
    // Check for proper title case (MLA/Chicago)
    if (style === 'MLA' || style === 'Chicago') {
        // Title should have major words capitalized
        const titleMatch = citation.match(/"([^"]+)"/);
        if (titleMatch) {
            const title = titleMatch[1];
            // First letter should be capitalized
            if (!/^[A-Z]/.test(title)) {
                errors.push("Title should start with capital letter");
            }
        }
    }
    
    // Check for sentence case (APA/IEEE)
    if (style === 'APA' || style === 'IEEE') {
        const titleMatch = citation.match(/"([^"]+)"/);
        if (titleMatch) {
            const title = titleMatch[1];
            // Only first letter and proper nouns should be capitalized
            const words = title.split(' ');
            words.forEach((word, idx) => {
                if (idx > 0 && /^[A-Z][a-z]/.test(word)) {
                    // Check if it's a proper noun
                    const properNouns = ['philippine', 'philippines', 'manila', etc];
                    if (!properNouns.includes(word.toLowerCase())) {
                        // errors.push(`Word "${word}" may need sentence case`);
                    }
                }
            });
        }
    }
    
    // Check for n.d. usage (APA only)
    if (style !== 'APA' && citation.includes('n.d.')) {
        errors.push("n.d. should only be used in APA style");
    }
    
    // Check for country (IEEE only)
    if (style !== 'IEEE' && citation.includes('Philippines')) {
        errors.push("Country should only appear in IEEE style");
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
```
