import DOMPurify from 'dompurify';

/** Escape HTML special characters in user-supplied text. */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Convert a small subset of Markdown to HTML.
 *
 * Input is HTML-escaped first, so any user-supplied HTML/JS will not survive.
 * Result is then sanitized with DOMPurify as a defense-in-depth layer.
 */
export function parseMarkdown(text: string): string {
    if (!text) return '';
    let t = escapeHtml(text);
    // Code blocks (must be before \n→<br>)
    t = t.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    // Headings
    t = t.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    t = t.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    t = t.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    // Lists
    t = t.replace(/^- (.*?)$/gm, '<li>$1</li>');
    // Links — already-escaped url and label; DOMPurify will strip javascript: schemes
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Bold & Italic
    t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Newlines
    t = t.replace(/\n/g, '<br>');

    return DOMPurify.sanitize(t, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'pre', 'code', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'title'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
}
