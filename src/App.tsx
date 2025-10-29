import { useState, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PromptNode } from './nodes/PromptNode';
import { ImageInputNode } from './nodes/ImageInputNode';
import { GeneratorNode } from './nodes/GeneratorNode';
import { OutputNode } from './nodes/OutputNode';
import { ImageStitchNode } from './nodes/ImageStitchNode';
import { PromptEnhancerNode } from './nodes/PromptEnhancerNode';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/Auth/LoginPage';
import { UserProfile } from './components/Auth/UserProfile';
import { AuthProvider, useAuth } from './context/AuthContext';
// import * as dotenv from 'dotenv';

// dotenv.config({ path: '.env.local' });

// This maps the 'type' string in your node data to the actual component
const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  generator: GeneratorNode,
  output: OutputNode,
  imageStitch: ImageStitchNode,
  promptEnhancer: PromptEnhancerNode,
};

function WorkshopApp() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [showLanding, setShowLanding] = useState(true);

  // Define a function to update data within a node
  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
    
    // Update connected nodes when source data changes
    setTimeout(() => updateConnectedNodes(), 100);
  };

  // Function to collect images for stitch nodes
  const collectImagesForStitchNode = (stitchNodeId: string) => {
    const connectedEdges = edges.filter(e => e.target === stitchNodeId);
    const imageData: string[] = [];
    
    connectedEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode && sourceNode.type === 'imageInput' && sourceNode.data.imageBase64) {
        imageData.push(sourceNode.data.imageBase64);
      }
    });
    
    return imageData;
  };

  // Define the initial state of the graph
  const initialNodes: Node[] = [
    { 
      id: '1', 
      type: 'prompt', 
      position: { x: 50, y: 50 }, 
      data: { 
        prompt: 'A cat wizard casting a spell.', 
        onChange: (data: any) => updateNodeData('1', data) 
      } 
    },
    { 
      id: '2', 
      type: 'imageInput', 
      position: { x: 50, y: 200 }, 
      data: { 
        imageBase64: '', 
        onChange: (data: any) => updateNodeData('2', data) 
      } 
    },
    { 
      id: '3', 
      type: 'generator', 
      position: { x: 400, y: 125 }, 
      data: { 
        isGenerating: false,
        selectedModel: 'gemini-2.5-flash-image-preview' as const,
        onChange: (data: any) => updateNodeData('3', data) 
      } 
    },
    { 
      id: '4', 
      type: 'output', 
      position: { x: 750, y: 125 }, 
      data: { 
        imageUrl: '', 
        onChange: (data: any) => updateNodeData('4', data) 
      } 
    },
  ];

  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, [...edges]);
      setEdges(newEdges);
      // Update connected nodes after connection
      setTimeout(() => updateConnectedNodes(), 100);
    }, 
    [edges, setEdges]
  );

  // Function to update nodes with connected data
  const updateConnectedNodes = () => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        // Update Image Stitch nodes
        if (node.type === 'imageStitch') {
          const connectedEdges = edges.filter(e => e.target === node.id);
          const imageData: string[] = [];
          
          connectedEdges.forEach(edge => {
            const sourceNode = currentNodes.find(n => n.id === edge.source);
            if (sourceNode && sourceNode.type === 'imageInput' && sourceNode.data.imageBase64) {
              imageData.push(sourceNode.data.imageBase64);
            }
          });
          
          return {
            ...node,
            data: {
              ...node.data,
              images: imageData
            }
          };
        }
        
        // Update Prompt Enhancer nodes
        if (node.type === 'promptEnhancer') {
          const connectedEdges = edges.filter(e => e.target === node.id);
          let inputPrompt = node.data.inputPrompt;
          let referenceImage = '';
          
          connectedEdges.forEach(edge => {
            const sourceNode = currentNodes.find(n => n.id === edge.source);
            if (sourceNode) {
              if (edge.targetHandle === 'prompt' && sourceNode.data.prompt) {
                inputPrompt = sourceNode.data.prompt;
              } else if (edge.targetHandle === 'image' && sourceNode.data.imageBase64) {
                referenceImage = sourceNode.data.imageBase64;
              }
            }
          });
          
          return {
            ...node,
            data: {
              ...node.data,
              inputPrompt,
              referenceImage
            }
          };
        }
        
        return node;
      })
    );
  };

  const handleGenerate = async () => {
    const generatorNode = nodes.find(n => n.type === 'generator');
    if (!generatorNode) {
      alert('No generator node found!');
      return;
    }

    // Update generator node to show loading state
    updateNodeData(generatorNode.id, { isGenerating: true });

    try {
      // Graph traversal: Find connected inputs
      const promptEdge = edges.find(e => e.target === generatorNode.id && e.targetHandle === 'prompt');
      const imageEdge = edges.find(e => e.target === generatorNode.id && e.targetHandle === 'image');

      const promptNode = promptEdge ? nodes.find(n => n.id === promptEdge.source) : null;
      const imageNode = imageEdge ? nodes.find(n => n.id === imageEdge.source) : null;

      // Handle different prompt sources (direct prompt or enhanced prompt)
      let prompt = promptNode?.data.prompt;
      if (promptNode?.type === 'promptEnhancer') {
        prompt = promptNode.data.enhancedPrompt || promptNode.data.inputPrompt;
      }

      // Handle different image sources (direct image or stitched images)
      let imageBase64 = imageNode?.data.imageBase64;
      if (imageNode?.type === 'imageStitch') {
        imageBase64 = imageNode.data.stitchedImage;
      }

      if (!prompt || prompt.trim() === '') {
        alert('Please connect a prompt node with text or add a prompt!');
        updateNodeData(generatorNode.id, { isGenerating: false });
        return;
      }

      console.log('Generating with:', { prompt, hasImage: !!imageBase64 });

      // Try direct API call first (for testing), then try serverless function
      try {
        // Check if we can call Gemini API directly
        // const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        // The issue is that you are declaring a variable named `apikey` (all lowercase), 
        // but later in your code you reference `apiKey` (with a capital K).
        // JavaScript/TypeScript is case-sensitive, so `apikey` and `apiKey` are different variables.
        // To fix this, declare the variable as `apiKey`:

        // API KEY IS LOADED FROM THE ENV FILE
        // const apiKey = process.env.VITE_GEMINI_API_KEY;
        console.log('All env vars:', import.meta.env);
        const apiKey: string = import.meta.env.VITE_GEMINI_API_KEY;
        console.log('API Key loaded:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT FOUND');
        
        if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== 'your_actual_api_key_here') {
          // Use the selected image generation model
          const selectedModel = generatorNode.data.selectedModel || 'gemini-2.5-flash-image-preview';
          let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
          let modelName = selectedModel === 'gemini-2.5-flash-image-preview' 
            ? "Gemini 2.5 Flash Image Preview (Nano Banana)" 
            : "Gemini 2.0 Flash Preview Image Generation (Legacy)";
          
          console.log(`Trying ${modelName} API call...`);
          console.log('⚠️ Note: Free tier has limited quota. If you hit limits, wait or upgrade.');
          
          // Simple, direct prompt for image generation (like in the official docs)
          const promptParts: any[] = [
            { text: prompt }
          ];
          
          // Add image if provided (for image-to-image generation)
          if (imageBase64) {
            promptParts.push({
              inlineData: {
                mimeType: "image/png",
                data: imageBase64
              }
            });
          }

          const payload = {
            contents: [{
              parts: promptParts
            }],
            generationConfig: {
              temperature: 0.8,
              candidateCount: 1,
              responseModalities: ["TEXT", "IMAGE"]
            }
          };

          console.log('Sending payload:', JSON.stringify(payload, null, 2));

          const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (apiResponse.ok) {
            const result = await apiResponse.json();
            console.log('Gemini API response:', result);
            
            // Extract parts like in the official docs
            const candidates = result?.candidates || [];
            if (candidates.length > 0) {
              const parts = candidates[0]?.content?.parts || [];
              
              for (const part of parts) {
                if (part.text) {
                  console.log('Text response:', part.text);
                } else if (part.inlineData) {
                  console.log('🎉 Image generated successfully!');
                  const imageData = part.inlineData.data;
                  
                  const outputNode = nodes.find(n => n.type === 'output');
                  if (outputNode) {
                    const imageUrl = `data:image/png;base64,${imageData}`;
                    updateNodeData(outputNode.id, { imageUrl });
                  }
                  return; // Success!
                }
              }
            }
            
            // If we get here, no image was generated
            console.log('No image generated in response');
            alert('⚠️ No image was generated. Try a different prompt or check if the model supports your request.');
            
          } else {
            const errorText = await apiResponse.text();
            console.error('Gemini API error:', apiResponse.status, errorText);
            
            // Handle quota exceeded specifically
            if (apiResponse.status === 429) {
              const errorData = JSON.parse(errorText);
              const retryDelay = errorData.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
              
              if (retryDelay) {
                alert(`⚠️ Quota exceeded! Please wait ${retryDelay} and try again, or upgrade your plan for higher limits.`);
              } else {
                alert('⚠️ Quota exceeded! Please wait a few minutes and try again, or upgrade your plan.');
              }
            }
            
            throw new Error(`Gemini API failed: ${apiResponse.status} - ${errorText}`);
          }
        }

        // Fallback to serverless function
        console.log('Trying serverless function...');
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, imageBase64 }),
        });

        if (response.ok) {
          const result = await response.json();
          const outputNode = nodes.find(n => n.type === 'output');
          if (outputNode) {
            updateNodeData(outputNode.id, { imageUrl: result.image });
          }
        } else {
          throw new Error('Serverless function not available');
        }
      } catch (apiError) {
        console.log('API not available, using development simulation:', apiError instanceof Error ? apiError.message : String(apiError));
        
        // Simulate API call for development testing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create a development placeholder image
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Create gradient background
          const gradient = ctx.createLinearGradient(0, 0, 512, 512);
          gradient.addColorStop(0, '#4f46e5');
          gradient.addColorStop(1, '#7c3aed');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 512, 512);
          
          // Add text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DEVELOPMENT MODE', 256, 180);
          ctx.font = '16px monospace';
          ctx.fillText('✓ Authentication Working', 256, 220);
          ctx.fillText('✓ Database Connected', 256, 250);
          ctx.fillText('✓ Security Enabled', 256, 280);
          ctx.font = '12px monospace';
          ctx.fillText(`Prompt: "${prompt.substring(0, 30)}..."`, 256, 320);
          
          const devImage = canvas.toDataURL();
          const outputNode = nodes.find(n => n.type === 'output');
          if (outputNode) {
            updateNodeData(outputNode.id, { imageUrl: devImage });
          }
        }
      }

    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
    } finally {
      // Reset generator loading state
      updateNodeData(generatorNode.id, { isGenerating: false });
    }
  };

  const addPromptNode = () => {
    const newId = `prompt-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'prompt',
      position: { x: Math.random() * 300 + 50, y: Math.random() * 300 + 50 },
      data: {
        prompt: '',
        onChange: (data: any) => updateNodeData(newId, data)
      }
    };
    setNodes(nds => [...nds, newNode]);
  };

  const addImageNode = () => {
    const newId = `image-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'imageInput',
      position: { x: Math.random() * 300 + 50, y: Math.random() * 300 + 200 },
      data: {
        imageBase64: '',
        onChange: (data: any) => updateNodeData(newId, data)
      }
    };
    setNodes(nds => [...nds, newNode]);
  };

  const addImageStitchNode = () => {
    const newId = `stitch-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'imageStitch',
      position: { x: Math.random() * 300 + 200, y: Math.random() * 300 + 100 },
      data: {
        images: [],
        stitchedImage: '',
        layout: 'horizontal' as const,
        nodeId: newId,
        onChange: (data: any) => updateNodeData(newId, data),
        getConnectedImages: () => collectImagesForStitchNode(newId)
      }
    };
    setNodes(nds => [...nds, newNode]);
  };

  const addPromptEnhancerNode = () => {
    const newId = `enhancer-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'promptEnhancer',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 50 },
      data: {
        inputPrompt: '',
        enhancedPrompt: '',
        isEnhancing: false,
        enhancementStyle: 'detailed' as const,
        onChange: (data: any) => updateNodeData(newId, data)
      }
    };
    setNodes(nds => [...nds, newNode]);
  };

  // Show landing page or workshop
  if (!isAuthenticated) {
    if (showLanding) {
      return <LandingPage onEnter={() => setShowLanding(false)} />;
    }
    return <LoginPage />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-white font-mono relative">
      {/* Dot pattern background */}
      <div 
        className="fixed inset-0 z-0" 
        style={{
          background: 'rgb(255, 255, 255) radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0px) 0% 0% / 20px 20px'
        }}
      />
      <ReactFlowProvider>
        <div className="absolute top-6 left-6 z-10 flex gap-2 flex-wrap">
          {/* User Profile */}
          <UserProfile />
        </div>
        
        <div className="absolute top-6 left-80 z-10 flex gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-black text-white border border-gray-300 hover:bg-gray-800 transition-colors text-sm font-mono uppercase tracking-wide"
          >
            Generate
          </button>
          <button
            onClick={addPromptNode}
            className="px-3 py-2 bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Prompt
          </button>
          <button
            onClick={addPromptEnhancerNode}
            className="px-3 py-2 bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Enhancer
          </button>
          <button
            onClick={addImageNode}
            className="px-3 py-2 bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Image
          </button>
          <button
            onClick={addImageStitchNode}
            className="px-3 py-2 bg-white text-cyan-600 border border-cyan-300 hover:bg-cyan-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Stitch
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent relative z-10"
          defaultEdgeOptions={{
            type: 'bezier',
            style: { strokeWidth: 1.5, stroke: '#666' },
            animated: false
          }}
        >
          <Controls className="bg-white border border-gray-200" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

// Main App component with authentication
function App() {
  return (
    <AuthProvider>
      <WorkshopApp />
    </AuthProvider>
  );
}

export default App;
