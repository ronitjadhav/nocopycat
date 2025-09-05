# NoCopyCat 🚫🐱

The smart way to build duplicate-free lists with style. NoCopyCat combines intelligent duplicate prevention with a bold neo-brutalist design for the ultimate list-building experience.

## ✨ Features

- **🚫 Zero Duplicates**: Intelligent duplicate prevention with real-time feedback
- **🎨 Neo-Brutalist Design**: Bold, striking visual design with heavy shadows and vibrant colors
- **📦 Batch Processing**: Handle multiple items at once via paste or comma/newline separation
- **👀 Paste Preview**: See what's new vs. duplicate before adding items
- **💾 Auto-Save**: Automatic local storage - your data persists between sessions
- **📤 Export/Import**: Save and load your lists as JSON or TXT files with timestamps
- **⚡ Live Feedback**: Real-time indication of duplicate vs. new items
- **📱 Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **♿ Accessible**: Built with accessibility in mind - keyboard navigation and screen reader support

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## 🚀 Usage

### Adding Items

- **Single Items**: Type words in the input field and press Enter or click "Add to List"
- **Batch Entry**: Separate multiple words with spaces, commas, or newlines
- **Smart Prevention**: Duplicates are automatically detected and prevented

### Paste Preview Magic

- **Safe Pasting**: Paste content fills the input but doesn't auto-add
- **Preview Mode**: See exactly what's new vs. duplicate before submitting
- **Batch Analysis**: Get instant feedback on batch operations

### Data Management

- **Export**: Download your list as JSON (with metadata) or TXT format
- **Import**: Upload JSON or TXT files to add items to your list
- **Auto-Save**: Your data is automatically saved locally
- **Delete**: Click the 🗑️ button next to any item to remove it

## Technology Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React 18** - UI library with hooks

## Project Structure

```text
src/
├── app/
│   ├── globals.css      # Global styles with Tailwind
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Main application component
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
