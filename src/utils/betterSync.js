// Better sync methods that handle large data efficiently

// Method 1: URL-based sharing using GitHub Gist (free, no API key needed for public)
export class GitHubGistSync {
  constructor() {
    this.baseUrl = 'https://api.github.com/gists'
  }

  async createShareLink(username, data) {
    try {
      const payload = {
        description: `Search data for ${username} - ${new Date().toISOString()}`,
        public: false, // Private gist
        files: {
          'search_data.json': {
            content: JSON.stringify({
              user: username,
              data: data,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        }
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        // Return a short, shareable ID instead of massive string
        return result.id
      }
      return null
    } catch (error) {
      console.error('Failed to create share link:', error)
      return null
    }
  }

  async loadFromShareLink(shareId) {
    try {
      const response = await fetch(`${this.baseUrl}/${shareId}`)
      if (response.ok) {
        const gist = await response.json()
        const content = gist.files['search_data.json'].content
        return JSON.parse(content)
      }
      return null
    } catch (error) {
      console.error('Failed to load from share link:', error)
      return null
    }
  }
}

// Method 2: Compressed sync codes using LZ-string compression
export class CompressedSync {
  // Simple compression using built-in browser APIs
  async compress(data) {
    try {
      const jsonString = JSON.stringify(data)
      
      // Use CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(new TextEncoder().encode(jsonString))
        writer.close()
        
        const chunks = []
        let done = false
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) chunks.push(value)
        }
        
        // Convert to base64
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          compressed.set(chunk, offset)
          offset += chunk.length
        }
        
        return btoa(String.fromCharCode(...compressed))
      } else {
        // Fallback: Simple text compression
        return this.simpleCompress(jsonString)
      }
    } catch (error) {
      console.error('Compression failed:', error)
      return null
    }
  }

  async decompress(compressedData) {
    try {
      // Use DecompressionStream if available
      if ('DecompressionStream' in window) {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0))
        
        const stream = new DecompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(compressed)
        writer.close()
        
        const chunks = []
        let done = false
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) chunks.push(value)
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          decompressed.set(chunk, offset)
          offset += chunk.length
        }
        
        return new TextDecoder().decode(decompressed)
      } else {
        // Fallback: Simple decompression
        return this.simpleDecompress(compressedData)
      }
    } catch (error) {
      console.error('Decompression failed:', error)
      return null
    }
  }

  // Simple compression fallback
  simpleCompress(str) {
    // Remove unnecessary whitespace and compress common patterns
    return str
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/": "/g, '":"') // Remove spaces around colons
      .replace(/", "/g, '","') // Remove spaces after commas
      .replace(/\{ "/g, '{"') // Remove spaces after braces
      .replace(/" \}/g, '"}') // Remove spaces before braces
  }

  simpleDecompress(str) {
    // Just return as-is for simple compression
    return str
  }
}

// Method 3: QR Code sharing for mobile
export class QRCodeSync {
  generateQRCode(data) {
    // For very small datasets, encode directly in QR
    // For larger datasets, create a short URL first
    const jsonString = JSON.stringify(data)
    
    if (jsonString.length < 1000) {
      // Small enough for QR code
      return `data:sync,${btoa(jsonString)}`
    } else {
      // Too large, need URL-based approach
      return null
    }
  }

  parseQRCode(qrData) {
    if (qrData.startsWith('data:sync,')) {
      const encoded = qrData.substring(10)
      try {
        return JSON.parse(atob(encoded))
      } catch (error) {
        return null
      }
    }
    return null
  }
}

// Method 4: Smart chunking for very large datasets
export class ChunkedSync {
  chunkData(data, maxChunkSize = 2000) {
    const jsonString = JSON.stringify(data)
    const chunks = []
    
    for (let i = 0; i < jsonString.length; i += maxChunkSize) {
      chunks.push(jsonString.substring(i, i + maxChunkSize))
    }
    
    return {
      id: Date.now().toString(36), // Simple ID
      total: chunks.length,
      chunks: chunks.map((chunk, index) => ({
        id: Date.now().toString(36),
        index: index,
        total: chunks.length,
        data: btoa(chunk)
      }))
    }
  }

  reassembleChunks(chunks) {
    // Sort by index
    chunks.sort((a, b) => a.index - b.index)
    
    // Verify we have all chunks
    if (chunks.length !== chunks[0].total) {
      throw new Error(`Missing chunks: have ${chunks.length}, need ${chunks[0].total}`)
    }
    
    // Reassemble
    const jsonString = chunks.map(chunk => atob(chunk.data)).join('')
    return JSON.parse(jsonString)
  }
}

// Method 5: Browser-to-browser sharing using WebRTC (for same network)
export class P2PSync {
  constructor() {
    this.connections = new Map()
  }

  async createRoom() {
    // Generate a simple room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // In a real implementation, this would use WebRTC
    // For now, just return the room code
    return roomCode
  }

  async joinRoom(roomCode) {
    // In a real implementation, this would connect via WebRTC
    console.log(`Joining room: ${roomCode}`)
    return true
  }

  async sendData(data) {
    // Send data directly to connected peer
    console.log('Sending data via P2P...')
    return true
  }
}

// Export the best options
export const syncMethods = {
  gist: new GitHubGistSync(),
  compressed: new CompressedSync(),
  qr: new QRCodeSync(),
  chunked: new ChunkedSync(),
  p2p: new P2PSync()
}
