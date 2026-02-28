// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../services/api';

// ── Citation style helpers ──────────────────────

const normalizeAuthorName = (name) => {
    if (name === name.toUpperCase()) {
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }
    return name;
};

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

const properNouns = [
    'philippine', 'philippines', 'manila', 'cebu', 'davao', 'quezon',
    'los', 'banos', 'tacloban', 'leyte', 'batangas', 'luzon', 'mindanao',
    'visayas', 'makiling', 'IPB', 'UPLB', 'UP', 'DOST', 'STII', 'var', 'spp',
    'pinggang', 'pinoy', 'metro', 'manila', 'laguna'
];

const toSentenceCase = (str) => {
    if (!str) return str;
    let result = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    result = result.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    result = result.replace(/:\s+([a-z])/g, (match, p1) => ': ' + p1.toUpperCase());
    properNouns.forEach(noun => {
        const regex = new RegExp(`\\b${noun}\\b`, 'gi');
        result = result.replace(regex, noun.charAt(0).toUpperCase() + noun.slice(1).toLowerCase());
    });
    result = result.replace(/Pinggang pinoy/gi, 'Pinggang Pinoy');
    result = result.replace(/Metro manila/gi, 'Metro Manila');
    result = result.replace(/\b[A-Z]{2,}\b/g, (match) => match);
    result = result.replace(/\[([a-z])/gi, (match, p1) => '[' + p1.toUpperCase());
    result = result.replace(/\[([A-Z][a-z]+)\s+([a-z])/g, (match, p1, p2) => '[' + p1 + ' ' + p2);
    return result;
};

const toTitleCase = (str) => {
    if (!str) return str;
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with', 'vs', 'via'];
    const majorWords = ['philippine', 'philippines', 'manila', 'cebu', 'davao', 'quezon', 'los', 'banos', 'tacloban', 'leyte', 'batangas', 'metro', 'manila', 'laguna', 'luzon', 'mindanao', 'visayas', 'makiling'];
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
    return { firstNames: parts.slice(0, lastNameStartIndex), lastName: parts.slice(lastNameStartIndex) };
};

const formatAuthorAPA = (name) => {
    const { firstNames, lastName } = parseAuthorName(name);
    const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
    const lastNameFormatted = lastName.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return `${lastNameFormatted}, ${initials}`;
};

const formatAuthorMLA = (name) => {
    const { firstNames, lastName } = parseAuthorName(name);
    const firstNamesFormatted = firstNames.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const lastNameFormatted = lastName.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return `${lastNameFormatted}, ${firstNamesFormatted}`.replace(/\.\.+/g, '.').replace(/\.\s*$/, '');
};

const formatAuthorIEEE = (name) => {
    const { firstNames, lastName } = parseAuthorName(name);
    const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
    const lastNameFormatted = lastName.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return `${initials} ${lastNameFormatted}`;
};

const formatDegree = (deg, citationStyle) => {
    const lowerDeg = deg.toLowerCase();
    const isDoctoral = lowerDeg.includes("doctor of") || lowerDeg.includes("doctoral") ||
        lowerDeg.includes("phd") || lowerDeg.includes("ph.d.") ||
        lowerDeg.includes("doctorate") || lowerDeg.includes("d.phil");
    const isMaster = lowerDeg.includes("master") || lowerDeg.includes("m.s.") ||
        lowerDeg.includes("m.sc") || lowerDeg.includes("ma");
    const isBachelor = lowerDeg.includes("bachelor") || lowerDeg.includes("b.s.") ||
        lowerDeg.includes("b.sc");

    if (citationStyle === 'IEEE') {
        if (isDoctoral) return "Ph.D. dissertation";
        if (isMaster) return "M.S. thesis";
        if (isBachelor) return "B.S. thesis";
        return "Ph.D. dissertation";
    }
    if (citationStyle === 'APA') {
        if (isDoctoral) return "Doctoral dissertation";
        if (isMaster) return "Master's thesis";
        if (isBachelor) return "Bachelor's thesis";
        return "Doctoral dissertation";
    }
    if (isDoctoral) return "Doctoral dissertation";
    if (isMaster) return "Master's thesis";
    if (isBachelor) return "Bachelor's thesis";
    return "Doctoral dissertation";
};

function generateCitation(selectedSource, style) {
    if (!selectedSource) return { plain: '', html: '' };

    const author = selectedSource.author || "Unknown Author";
    const year = selectedSource.year || "n.d.";
    const title = selectedSource.title || "Untitled";
    const school = selectedSource.school || "Unknown Institution";
    const degree = selectedSource.degree || "Thesis";

    const normalizedAuthor = normalizeAuthorName(author);
    const normalizedSchool = normalizeSchool(school);

    let citation = "";
    switch (style) {
        case "APA": {
            const apaAuthor = formatAuthorAPA(normalizedAuthor);
            const apaTitle = toSentenceCase(title);
            const apaDegree = formatDegree(degree, 'APA');
            citation = `${apaAuthor} (${year}). <i>${apaTitle}</i> (${apaDegree}, ${normalizedSchool}).`;
            break;
        }
        case "MLA": {
            const mlaAuthor = formatAuthorMLA(normalizedAuthor);
            const mlaTitle = toTitleCase(title);
            const mlaDegree = formatDegree(degree, 'MLA');
            citation = `${mlaAuthor}. <i>${mlaTitle}</i>. ${normalizedSchool}, ${year}. ${mlaDegree}.`;
            break;
        }
        case "Chicago": {
            const chicagoAuthor = formatAuthorMLA(normalizedAuthor);
            const chicagoTitle = toTitleCase(title);
            const chicagoDegree = formatDegree(degree, 'Chicago');
            citation = `${chicagoAuthor}. <i>${chicagoTitle}</i>. ${chicagoDegree}, ${normalizedSchool}, ${year}.`;
            break;
        }
        case "IEEE": {
            const ieeeAuthor = formatAuthorIEEE(normalizedAuthor);
            const ieeeDegreeFormatted = formatDegree(degree, 'IEEE');
            const ieeeTitle = toTitleCase(title);
            citation = `${ieeeAuthor}, <i>${ieeeTitle}</i>, ${ieeeDegreeFormatted}, ${normalizedSchool}, Philippines, ${year}.`;
            break;
        }
        default:
            citation = "";
    }

    citation = citation.replace(/\.\.+/g, '.').replace(/,\./g, '.').replace(/,\s*\./g, '.').replace(/\s+/g, ' ').trim();
    const plain = citation.replace(/<[^>]*>/g, '');
    return { plain, html: citation };
}

// ── Component ───────────────────────────────────

const CitationModal = ({ isOpen, onClose, selectedSource, userId, currentSessionId, showToast }) => {
    const [selectedStyle, setSelectedStyle] = useState("APA");
    const [generatedPlain, setGeneratedPlain] = useState("");
    const [formattedHtml, setFormattedHtml] = useState("");

    useEffect(() => {
        if (isOpen && selectedSource) {
            const { plain, html } = generateCitation(selectedSource, selectedStyle);
            setGeneratedPlain(plain);
            setFormattedHtml(html);
        }
    }, [isOpen, selectedStyle, selectedSource]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center">
            <div className="bg-white w-10/12 md:w-2/3 lg:w-1/2 xl:w-[40%] rounded-lg shadow-2xl flex">

                {/* Style Selector */}
                <div className="w-1/3 bg-gray-100 border-r p-6">
                    <h3 className="font-semibold mb-4 text-gray-800">Citation Style</h3>
                    {["APA", "MLA", "Chicago", "IEEE"].map((style) => (
                        <button
                            key={style}
                            className={`block w-full text-left px-4 py-2 rounded mb-2
                                ${selectedStyle === style ? "bg-[#1E74BC] text-white" : "hover:bg-[#d7e8f6]"}`}
                            onClick={() => setSelectedStyle(style)}
                        >
                            {style === "APA" ? "APA (7th edition)" :
                                style === "MLA" ? "MLA (9th edition)" : style}
                        </button>
                    ))}
                </div>

                {/* Generated Citation */}
                <div className="w-2/3 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
                    >
                        ×
                    </button>
                    <h3 className="font-semibold text-gray-800 mb-3">{selectedStyle} Citation</h3>
                    <div
                        className="w-full h-40 border p-3 rounded text-gray-700 overflow-auto bg-gray-50"
                        dangerouslySetInnerHTML={{ __html: formattedHtml }}
                    />
                    <button
                        className="mt-4 bg-[#1E74BC] text-white px-4 py-2 rounded hover:bg-[#185f99]"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(generatedPlain);
                                showToast('Citation copied to clipboard!', 'success');
                                try {
                                    await fetch(`${API_BASE_URL}/track-citation/`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            file: selectedSource?.file || selectedSource?.fullTextPath,
                                            citation_style: selectedStyle,
                                            user_id: userId,
                                            session_id: currentSessionId
                                        })
                                    });
                                } catch (error) {
                                    console.error('Failed to track citation copy:', error);
                                }
                            } catch (error) {
                                console.error('Error copying citation:', error);
                                showToast('Citation could not be generated!', 'error');
                            }
                        }}
                    >
                        Copy to Clipboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CitationModal;
