import { useState, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PromptNode } from './nodes/PromptNode';
import { ImageInputNode } from './nodes/ImageInputNode';
import { GeneratorNode } from './nodes/GeneratorNode';
import { OutputNode } from './nodes/OutputNode';

// This maps the 'type' string in your node data to the actual component
const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  generator: GeneratorNode,
  output: OutputNode,
};

function App() {
  // Define a function to update data within a node
  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
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
    (params: Connection) => setEdges((eds) => addEdge(params, eds)), 
    [setEdges]
  );

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

      const prompt = promptNode?.data.prompt;
      const imageBase64 = imageNode?.data.imageBase64;

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

        const apiKey: string = "AIzaSyC5BghiKZSW93zzwcM3DEilUR_g98XA8vc";
        console.log('API Key loaded:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT FOUND');
        
        if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== 'your_actual_api_key_here') {
          console.log('Trying Gemini 2.0 Flash Preview Image Generation API call...');
          console.log('⚠️ Note: Free tier has limited quota. If you hit limits, wait or upgrade.');
          
          // For image generation, we need to use the image preview model
          // But let's try different approaches based on quota availability
          // Use the actual image generation model
           let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
            let modelName = "Gemini 2.0 Flash Preview Image Generation";
          
          // Alternative models to try if quota is exceeded
          const fallbackModels = [
            { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, name: "Gemini 1.5 Pro" },
            { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, name: "Gemini 2.0 Flash" }
          ];
          
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
        console.log('API not available, using simulation mode:', apiError instanceof Error ? apiError.message : String(apiError));
        
        // Simulate API call for demo purposes
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const outputNode = nodes.find(n => n.type === 'output');
        if (outputNode) {
          updateNodeData(outputNode.id, { 
            imageUrl: `https://via.placeholder.com/512x512/4f46e5/ffffff?text=${encodeURIComponent(prompt.slice(0, 20))}...`
          });
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

  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-gray-50">
      <ReactFlowProvider>
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
          >
            🚀 Generate
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
          className="bg-gray-100"
        >
          <Controls />
          <Background gap={20} size={1} color="#e5e7eb" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default App;
