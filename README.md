# Remove Background

A browser-based tool for removing image backgrounds. Built with modern web technologies and a clean, responsive interface.

[Try it here](https://shalom-lab.github.io/remove-background)

![Clean interface](screenshot.png)

## Features

- 🎯 Single-page web application with modern UI
- 🔒 Client-side processing - your images never leave your browser
- 💾 Automatic model caching for faster subsequent uses
- 📱 Responsive design that works on both desktop and mobile
- ⚡ Real-time background removal using AI
- 🖼️ PNG download with transparency

## How It Works

The tool uses the [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) model from Hugging Face for image segmentation. All processing happens directly in your browser using TensorFlow.js, ensuring your images remain private.

### Usage

1. Open the tool in your browser
2. Click "Upload Image" to select an image
3. Click "Remove Background" to process
4. Download the result as a transparent PNG

## Technical Details

- Built with vanilla JavaScript and modern CSS
- Uses Hugging Face Transformers.js for model inference
- Service Worker for efficient model caching
- Canvas API for image processing
- Responsive CSS Grid and Flexbox layout

### Key Components

- `index.html`: Single-page application with embedded styles and logic
- `sw.js`: Service Worker for model caching
- Modern UI features:
  - Loading indicators with animations
  - Responsive image grid
  - Clean button design
  - Status updates with emojis
  - Modal dialogs for user interaction

## Development

To run locally:

```bash
# Using Python's built-in server
python -m http.server 8000

# Or using Node's http-server
npx http-server
```

Then open `http://localhost:8000` in your browser.

## Browser Support

Works best in modern browsers that support:
- ES6+ JavaScript
- Service Workers
- Canvas API
- CSS Grid/Flexbox

## Credits

- [Hugging Face Transformers](https://huggingface.co/docs/transformers.js) for the machine learning framework
- [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) model by BriaAI

## License

MIT License - See [LICENSE](LICENSE) for details 