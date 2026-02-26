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
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/Auth/LoginPage';
import { UserProfile } from './components/Auth/UserProfile';
import { AuthProvider, useAuth } from './context/AuthContext';
import * as api from './services/api';

const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  generator: GeneratorNode,
  output: OutputNode,
};

function WorkshopApp() {
  const { isAuthenticated, refreshUser } = useAuth();
  const [showLanding, setShowLanding] = useState(true);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
    setTimeout(() => updateConnectedNodes(), 100);
  };

  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'prompt',
      position: { x: 50, y: 125 },
      data: {
        prompt: 'A cat wizard casting a spell.',
        onChange: (data: any) => updateNodeData('1', data),
      },
    },
    {
      id: '2',
      type: 'generator',
      position: { x: 400, y: 100 },
      data: {
        isGenerating: false,
        selectedModel: 'gemini-2.5-flash-image-preview',
        seed: null,
        lockSeed: false,
        autoRefine: true,
        refinedPrompt: '',
        showRefineDialog: false,
        refineQuestions: [],
        isRefining: false,
        lastPrompt: '',
        promptHistory: [],
        onChange: (data: any) => updateNodeData('2', data),
        onGenerate: () => handleGenerate('2'),
        onRefine: (mode: string, extra?: any) => handleRefine('2', mode, extra),
      },
    },
  ];

  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, [...edges]);
      setEdges(newEdges);
      setTimeout(() => updateConnectedNodes(), 100);
    },
    [edges, setEdges]
  );

  const updateConnectedNodes = () => {
    // No automatic data propagation needed in simplified architecture.
    // Images and prompts are resolved at generation time via graph traversal.
  };

  const resolveGeneratorInputs = (generatorNodeId: string) => {
    const currentNodes = nodes;
    const currentEdges = edges;

    const promptEdge = currentEdges.find(
      (e) => e.target === generatorNodeId && e.targetHandle === 'prompt'
    );
    const imageEdges = currentEdges.filter(
      (e) => e.target === generatorNodeId && e.targetHandle === 'image'
    );

    const promptNode = promptEdge
      ? currentNodes.find((n) => n.id === promptEdge.source)
      : null;

    let prompt = promptNode?.data.prompt || '';

    const images: string[] = [];
    imageEdges.forEach((edge) => {
      const src = currentNodes.find((n) => n.id === edge.source);
      if (
        src &&
        (src.type === 'imageInput' || src.type === 'output') &&
        src.data.imageBase64
      ) {
        images.push(src.data.imageBase64);
      }
    });

    return { prompt, images };
  };

  const handleRefine = async (
    generatorNodeId: string,
    mode: string,
    extra?: any
  ) => {
    const { prompt, images } = resolveGeneratorInputs(generatorNodeId);

    if (!prompt.trim() && mode !== 'apply') {
      alert('Connect a prompt node first!');
      return;
    }

    updateNodeData(generatorNodeId, { isRefining: true });

    try {
      const result = await api.refinePrompt({
        prompt: mode === 'apply' ? extra?.originalPrompt || prompt : prompt,
        mode: mode as 'auto' | 'questions' | 'apply',
        referenceImages: images,
        answers: mode === 'apply' ? extra?.answers : undefined,
      });

      if (mode === 'questions') {
        const qResult = result as api.RefineQuestionsResponse;
        updateNodeData(generatorNodeId, {
          refineQuestions: qResult.questions || [],
          showRefineDialog: true,
          isRefining: false,
        });
      } else {
        const pResult = result as api.RefinePromptResponse;
        updateNodeData(generatorNodeId, {
          refinedPrompt: pResult.refinedPrompt || '',
          showRefineDialog: false,
          refineQuestions: [],
          isRefining: false,
        });
      }
    } catch (error) {
      console.error('Refine failed:', error);
      updateNodeData(generatorNodeId, { isRefining: false });
    }
  };

  const handleGenerate = async (generatorNodeId?: string) => {
    const generatorNode = generatorNodeId
      ? nodes.find((n) => n.id === generatorNodeId)
      : nodes.find((n) => n.type === 'generator');

    if (!generatorNode) {
      alert('No generator node found!');
      return;
    }

    updateNodeData(generatorNode.id, { isGenerating: true });

    try {
      const { prompt, images } = resolveGeneratorInputs(generatorNode.id);

      if (!prompt.trim()) {
        alert('Please connect a prompt node with text!');
        updateNodeData(generatorNode.id, { isGenerating: false });
        return;
      }

      let actualPrompt = prompt;

      if (generatorNode.data.autoRefine) {
        try {
          const refineResult = await api.refinePrompt({
            prompt,
            mode: 'auto',
            referenceImages: images,
          }) as api.RefinePromptResponse;
          if (refineResult.refinedPrompt) {
            actualPrompt = refineResult.refinedPrompt;
            updateNodeData(generatorNode.id, { refinedPrompt: actualPrompt });
          }
        } catch {
          // Auto-refine failed silently, use original prompt
        }
      }

      if (generatorNode.data.refinedPrompt && !generatorNode.data.autoRefine) {
        actualPrompt = generatorNode.data.refinedPrompt;
      }

      const seed = generatorNode.data.lockSeed
        ? generatorNode.data.seed
        : null;
      const model =
        generatorNode.data.selectedModel || 'gemini-2.5-flash-image-preview';

      const result = await api.generateImage({
        prompt: actualPrompt,
        images,
        model,
        seed,
      });

      const imageBase64 = result.image.replace(
        /^data:image\/\w+;base64,/,
        ''
      );

      const existingOutputEdge = edges.find(
        (e) =>
          e.source === generatorNode.id &&
          nodes.find((n) => n.id === e.target)?.type === 'output'
      );

      const historyEntry = {
        id: `pv-${Date.now()}`,
        prompt,
        refinedPrompt:
          actualPrompt !== prompt ? actualPrompt : undefined,
        parentId:
          generatorNode.data.promptHistory?.length > 0
            ? generatorNode.data.promptHistory[
                generatorNode.data.promptHistory.length - 1
              ].id
            : null,
        timestamp: Date.now(),
        source: generatorNode.data.autoRefine
          ? ('auto-refine' as const)
          : ('manual' as const),
      };

      updateNodeData(generatorNode.id, {
        lastPrompt: actualPrompt,
        promptHistory: [
          ...(generatorNode.data.promptHistory || []),
          historyEntry,
        ],
      });

      if (existingOutputEdge) {
        updateNodeData(existingOutputEdge.target, {
          imageUrl: result.image,
          imageBase64,
          currentPrompt: actualPrompt,
        });
      } else {
        const newId = `output-${Date.now()}`;
        const pos = {
          x: generatorNode.position.x + 380,
          y: generatorNode.position.y,
        };
        const newNode: Node = {
          id: newId,
          type: 'output',
          position: pos,
          data: {
            imageUrl: result.image,
            imageBase64,
            currentPrompt: actualPrompt,
            onChange: (data: any) => updateNodeData(newId, data),
          },
        };
        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [
          ...eds,
          {
            id: `e-${generatorNode.id}-${newId}`,
            source: generatorNode.id,
            target: newId,
          },
        ]);
      }

      await refreshUser();
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
    } finally {
      updateNodeData(generatorNode.id, { isGenerating: false });
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
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50,
      },
      data: {
        prompt: '',
        onChange: (data: any) => updateNodeData(newId, data),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addImageNode = () => {
    const newId = `image-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'imageInput',
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 200,
      },
      data: {
        imageBase64: '',
        onChange: (data: any) => updateNodeData(newId, data),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addGeneratorNode = () => {
    const newId = `generator-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'generator',
      position: {
        x: Math.random() * 300 + 200,
        y: Math.random() * 300 + 100,
      },
      data: {
        isGenerating: false,
        selectedModel: 'gemini-2.5-flash-image-preview',
        seed: null,
        lockSeed: false,
        autoRefine: true,
        refinedPrompt: '',
        showRefineDialog: false,
        refineQuestions: [],
        isRefining: false,
        lastPrompt: '',
        promptHistory: [],
        onChange: (data: any) => updateNodeData(newId, data),
        onGenerate: () => handleGenerate(newId),
        onRefine: (mode: string, extra?: any) =>
          handleRefine(newId, mode, extra),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  if (!isAuthenticated) {
    if (showLanding) {
      return <LandingPage onEnter={() => setShowLanding(false)} />;
    }
    return <LoginPage />;
  }

  return (
    <div
      style={{ width: '100vw', height: '100vh' }}
      className="bg-white font-mono relative"
    >
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            'rgb(255, 255, 255) radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0px) 0% 0% / 20px 20px',
        }}
      />
      <ReactFlowProvider>
        <div className="absolute top-6 left-6 z-10 flex gap-2 flex-wrap">
          <UserProfile />
        </div>

        <div className="absolute top-6 left-80 z-10 flex gap-2 flex-wrap">
          <button
            onClick={addPromptNode}
            className="px-3 py-2 bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Prompt
          </button>
          <button
            onClick={addImageNode}
            className="px-3 py-2 bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Image
          </button>
          <button
            onClick={addGeneratorNode}
            className="px-3 py-2 bg-white text-purple-600 border border-purple-300 hover:bg-purple-50 transition-colors text-xs font-mono uppercase tracking-wide"
          >
            + Generator
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
            animated: false,
          }}
        >
          <Controls className="bg-white border border-gray-200" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WorkshopApp />
    </AuthProvider>
  );
}

export default App;
