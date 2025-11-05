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

      // Always use protected backend endpoint so limits + usage apply
      const response = await fetch('http://localhost:3001/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          imageBase64,
          model: generatorNode.data.selectedModel || 'gemini-2.5-flash-image-preview'
        })
      });

      if (response.ok) {
        const result = await response.json();
        const outputNode = nodes.find(n => n.type === 'output');
        if (outputNode) {
          updateNodeData(outputNode.id, { imageUrl: result.image });
        }
        // Refresh user usage after successful generation
        await refreshUser();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(errorData.error || `API Error: ${response.status}`);
        throw new Error(`API Error: ${response.status}`);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
    } finally {
      // Reset generator loading state
      updateNodeData(generatorNode.id, { isGenerating: false });
      // Ensure usage bar reflects latest counts even after errors/limits
      try {
        await refreshUser();
      } catch {}
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
