# VinciUI - Comfy Gemini Interface

A node-based visual interface for Google Gemini image generation, built with React Flow and TypeScript.

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (v18 or higher) and npm installed on your system.

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173` to see the application.

## 📋 Project Status

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Project setup with Vite + React + TypeScript
- [x] React Flow canvas with interactive nodes
- [x] Custom node components:
  - **Prompt Node**: Text input for generation prompts
  - **Image Input Node**: File upload for reference images
  - **Generator Node**: Central processing node with loading states
  - **Output Node**: Display and download generated images
- [x] Node connections and state management
- [x] Beautiful UI with Tailwind CSS

### ✅ Phase 2: API Integration (COMPLETED)
- [x] Secure serverless API route for Gemini
- [x] Real image generation workflow with fallback
- [x] Graph traversal and data flow
- [x] Environment configuration setup
- [x] Comprehensive setup documentation

### 📅 Phase 3: Advanced Features (PLANNED)
- [ ] Canvas Node for image composition
- [ ] Save/Load workflow functionality
- [ ] Multiple image inputs and combinations

### 🔮 Phase 4: Production (FUTURE)
- [ ] Firebase authentication
- [ ] User accounts and credit system
- [ ] Stripe payment integration

## 🎮 Current Features

- **Interactive Canvas**: Drag and drop nodes, create connections
- **Live Preview**: Real-time updates as you type and connect nodes
- **Modern UI**: Clean, responsive interface with hover effects
- **Simulated Generation**: Click "Generate" for a demo workflow

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── nodes/           # Custom React Flow node components
│   ├── PromptNode.tsx
│   ├── ImageInputNode.tsx
│   ├── GeneratorNode.tsx
│   └── OutputNode.tsx
├── App.tsx          # Main application component
├── main.tsx         # Application entry point
└── index.css        # Global styles with Tailwind
```

## 🔧 Next Steps

### Ready for Production Use!

1. **Set up Gemini API**: Follow the detailed guide in `SETUP_PHASE2.md`
2. **Get your API key**: From Google AI Studio
3. **Configure environment**: Copy `env.example` to `.env.local` and add your key
4. **Deploy**: Use Vercel, Netlify, or any serverless platform

### Continuing Development:

- **Phase 3**: Canvas Node for image composition
- **Phase 4**: User accounts, payments, and database integration

## 📝 Notes

This project follows the comprehensive plan outlined in `plan.md`. Phases 1 & 2 are complete - the app is fully functional and ready for production use with your Gemini API key!
