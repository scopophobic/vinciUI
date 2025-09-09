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

      // Try real API first, fall back to simulation
      try {
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
          throw new Error('API not available, using simulation');
        }
      } catch (apiError) {
        console.log('API not available, using simulation mode');
        
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
