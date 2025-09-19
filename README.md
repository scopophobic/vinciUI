# VinciUI - Node-Based AI Image Generation

A beautiful, minimal node-based visual interface for AI image generation powered by Google's Gemini models.

![VinciUI Interface](image.png)

## ✨ Features

- **🎨 Visual Workflow**: Build image generation pipelines by connecting intuitive nodes
- **⚡ AI Enhanced**: Powered by Gemini 2.5 Flash for superior image generation
- **🔧 Advanced Tools**: Image stitching, prompt enhancement, and multi-model support
- **🎯 Model Selection**: Choose between Gemini 2.5 Flash (Nano Banana) and legacy models
- **📱 Modern UI**: Clean, minimal design with elegant dot pattern background
- **🔗 Node Types**: Prompt, Image Input, Generator, Output, Image Stitch, Prompt Enhancer

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Google AI API Key** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vinciUI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   # Create the environment file
   touch .env.local
   ```
   
   Add your Gemini API key to `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` to see the application.

## 🔑 Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Paste it in your `.env.local` file

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️**