/**
 * Safely formats API RAG documents into UI-friendly source objects.
 */
export const formatSources = (documents: any[]) => {
    if (!documents || !Array.isArray(documents)) return [];

    return documents.map((doc, index) => ({
        id: Date.now() + index,
        title: doc.title || '[Unknown Title]',
        author: doc.author || '[Unknown Author]',
        year: doc.publication_year || '[Unknown Year]',
        abstract: doc.abstract || 'Abstract not available.',
        fullTextPath: doc.file || '',
        file: doc.file || '',
        degree: doc.degree || 'Thesis',
        subjects: doc.subjects || ['Research'],
        school: doc.university || '[Unknown University]',
        view_count: doc.view_count || 0,
        avg_rating: doc.avg_rating || 0,
    }));
};
