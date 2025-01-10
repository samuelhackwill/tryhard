import fs from 'fs'

function sanitizeKey(header) {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
}

parseMarkdown = function (filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8')

  // Remove commented sections
  const uncommentedContent = fileContent.replace(/<!--[\s\S]*?-->/g, '')

  const lines = uncommentedContent.split('\n')
  const result = []
  let currentHeader = null

  for (let line of lines) {
    line = line.trim()

    // If line is a header
    if (line.startsWith('## ')) {
      currentHeader = sanitizeKey(line.slice(3)) // Extract header and sanitize
      result.push({ header: currentHeader, content: [] })
    } else if (currentHeader && line) {
      // Determine the type of the line (text or command)
      const type = line.startsWith('`') && line.endsWith('`') ? 'command' : 'text'
      const value = line.startsWith('`') && line.endsWith('`') ? line.slice(1, -1) : line

      // Add the parsed line to the current section
      result[result.length - 1].content.push({ type, value })
    }
  }
  return result
}
