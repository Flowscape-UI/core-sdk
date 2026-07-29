import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';
import {
    Scene,
    NodeRect,
    NodeEllipse,
    NodeLine,
    NodeText,
    NodeStar,
    LayerBackground,
    LayerWorld,
    LayerOverlay,
    LayerUI,
    RendererLayerBackgroundCanvas,
    CanvasRendererHost,
    RendererLayerWorldCanvas,
    RendererLayerOverlayCanvas,
    RendererLayerUI,
    LayerWorldInputController,
    LayerOverlayInputController,
} from '@flowscape-ui/core-sdk';

type FlowscapeEditorProps = {
    className?: string;
    height?: number | string;
    backgroundFill?: string;
    logoUrl?: string;
};

type EditorTool = 'move' | 'rect' | 'ellipse' | 'line' | 'text' | 'star';

const logoDefaultUrl = require('@site/static/img/logo.png').default as string;
const TOOLBAR_ITEMS: ReadonlyArray<{ id: EditorTool; label: string }> = [
    { id: 'move', label: 'Move' },
    { id: 'rect', label: 'Rectangle' },
    { id: 'ellipse', label: 'Ellipse' },
    { id: 'line', label: 'Line' },
    { id: 'text', label: 'Text' },
    { id: 'star', label: 'Star' },
];


function FlowscapeEditorInner({
    className,
    height,
    backgroundFill,
    logoUrl,
}: Required<FlowscapeEditorProps>) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [activeTool, setActiveTool] = useState<EditorTool>('move');
    const activeToolRef = useRef<EditorTool>('move');

    const setTool = (tool: EditorTool) => {
        activeToolRef.current = tool;
        setActiveTool(tool);
    };

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) {
            return;
        }

        const scene = new Scene(mount.clientWidth, mount.clientHeight);
        const layerBackground = new LayerBackground();
        const layerWorld = new LayerWorld();
        const layerOverlay = new LayerOverlay(layerWorld);
        const layerUI = new LayerUI(layerWorld);

        scene.addLayer(layerBackground);
        scene.addLayer(layerWorld);
        scene.addLayer(layerOverlay);
        scene.addLayer(layerUI);

        const backgroundRenderer = new RendererLayerBackgroundCanvas();
        scene.bindLayerRenderer(layerBackground, backgroundRenderer);

        const worldRenderer = new RendererLayerWorldCanvas();
        scene.bindLayerRenderer(layerWorld, worldRenderer);

        const overlayRenderer = new RendererLayerOverlayCanvas();
        scene.bindLayerRenderer(layerOverlay, overlayRenderer);

        const uiRenderer = new RendererLayerUI(mount);
        scene.bindLayerRenderer(layerUI, uiRenderer);

        const canvasRendererHost = new CanvasRendererHost(mount, -1);
        scene.addHost(canvasRendererHost);

        const worldInputController = new LayerWorldInputController();

        scene.inputManager.add(
            layerWorld,
            worldInputController,
            {
                stage: canvasRendererHost.getRenderNode(),
                world: layerWorld,
                options: {
                    enabled: true,
                    panMode: 'right',
                    zoomEnabled: true,
                    zoomFactor: 1.08,
                    preventWheelDefault: true,
                    keyboardPanSpeed: 900,
                    keyboardPanShiftMultiplier: 1.5,
                },
                emitChange: () => {
                    scene.invalidate();
                },
            },
        );

        let overlayInteractionOwner: string | null = null;
        const overlayInputController = new LayerOverlayInputController();
        scene.inputManager.add(
            layerOverlay,
            overlayInputController,
            {
                stage: canvasRendererHost.getRenderNode(),
                world: layerWorld,
                overlay: layerOverlay,
                emitChange: () => {
                    scene.invalidate();
                },
                getInteractionOwner: () => overlayInteractionOwner,
                tryBeginInteraction: (ownerId: string) => {
                    if (overlayInteractionOwner !== null) {
                        return overlayInteractionOwner === ownerId;
                    }
                    overlayInteractionOwner = ownerId;
                    return true;
                },
                endInteraction: (ownerId: string) => {
                    if (overlayInteractionOwner === ownerId) {
                        overlayInteractionOwner = null;
                    }
                },
            },
        );

        layerBackground.setFill(backgroundFill);
        layerBackground.setImage(logoUrl);
        layerBackground.setImageOpacity(0.5);
        layerBackground.setImageSize(250, 250);
        layerBackground.setImageOffsetX('50%');
        layerBackground.setImageOffsetY('50%');
        layerBackground.setImagePosition('50%', '50%');

        let nextNodeId = 1;
        const stage = canvasRendererHost.getRenderNode();
        const stageSurface = canvasRendererHost.getSurface();

        const toStagePoint = (clientX: number, clientY: number) => {
            const rect = stage.container().getBoundingClientRect();
            const stageWidth = stage.width() || 1;
            const stageHeight = stage.height() || 1;
            const scaleX = rect.width > 0 ? rect.width / stageWidth : 1;
            const scaleY = rect.height > 0 ? rect.height / stageHeight : 1;

            return {
                x: (clientX - rect.left) / scaleX,
                y: (clientY - rect.top) / scaleY,
            };
        };

        const createNodeAt = (tool: EditorTool, worldX: number, worldY: number) => {
            const nodeId = nextNodeId++;
            const placeAtPointer = (node: {
                setPosition: (x: number, y: number) => void;
            }) => {
                node.setPosition(worldX, worldY);
            };

            if (tool === 'rect') {
                const rectNode = new NodeRect(nodeId);
                rectNode.setSize(180, 120);
                placeAtPointer(rectNode);
                layerWorld.addNode(rectNode);
                return;
            }

            if (tool === 'ellipse') {
                const ellipseNode = new NodeEllipse(nodeId);
                ellipseNode.setSize(160, 160);
                placeAtPointer(ellipseNode);
                layerWorld.addNode(ellipseNode);
                return;
            }

            if (tool === 'line') {
                const lineNode = new NodeLine(nodeId);
                lineNode.setStart({ x: 0, y: 0 });
                lineNode.setEnd({ x: 180, y: 0 });
                placeAtPointer(lineNode);
                layerWorld.addNode(lineNode);
                return;
            }

            if (tool === 'text') {
                const textNode = new NodeText(nodeId);
                textNode.setText('Text');
                textNode.setSize(220, 64);
                placeAtPointer(textNode);
                layerWorld.addNode(textNode);
                return;
            }

            if (tool === 'star') {
                const starNode = new NodeStar(nodeId);
                starNode.setSize(170, 170);
                placeAtPointer(starNode);
                layerWorld.addNode(starNode);
            }
        };

        const seedInitialContent = () => {
            const frameNode = new NodeRect(nextNodeId++);
            frameNode.setSize(860, 420);
            frameNode.setPosition(0, 34);
            frameNode.setFill('#0b1220');
            frameNode.setStrokeFill('#2f7cf6');
            frameNode.setStrokeWidth({ t: 4, r: 4, b: 4, l: 4 });
            layerWorld.addNode(frameNode);

            const leftCard = new NodeRect(nextNodeId++);
            leftCard.setSize(220, 108);
            leftCard.setPosition(-268, -88);
            leftCard.setFill('#172036');
            leftCard.setStrokeFill('#38bdf8');
            leftCard.setStrokeWidth({ t: 4, r: 4, b: 4, l: 4 });
            layerWorld.addNode(leftCard);

            const centerCard = new NodeRect(nextNodeId++);
            centerCard.setSize(220, 108);
            centerCard.setPosition(0, -88);
            centerCard.setFill('#172036');
            centerCard.setStrokeFill('#22d3ee');
            centerCard.setStrokeWidth({ t: 4, r: 4, b: 4, l: 4 });
            layerWorld.addNode(centerCard);

            const rightCard = new NodeRect(nextNodeId++);
            rightCard.setSize(220, 108);
            rightCard.setPosition(268, -88);
            rightCard.setFill('#172036');
            rightCard.setStrokeFill('#f59e0b');
            rightCard.setStrokeWidth({ t: 4, r: 4, b: 4, l: 4 });
            layerWorld.addNode(rightCard);

            const leftCardTitle = new NodeText(nextNodeId++);
            leftCardTitle.setText('Input');
            leftCardTitle.setFontSize(24);
            leftCardTitle.setFontWeight(800);
            leftCardTitle.setSize(170, 38);
            leftCardTitle.setPosition(-268, -102);
            leftCardTitle.setFill('#e2e8f0');
            layerWorld.addNode(leftCardTitle);

            const centerCardTitle = new NodeText(nextNodeId++);
            centerCardTitle.setText('Layout');
            centerCardTitle.setFontSize(24);
            centerCardTitle.setFontWeight(800);
            centerCardTitle.setSize(170, 38);
            centerCardTitle.setPosition(0, -102);
            centerCardTitle.setFill('#e2e8f0');
            layerWorld.addNode(centerCardTitle);

            const rightCardTitle = new NodeText(nextNodeId++);
            rightCardTitle.setText('Output');
            rightCardTitle.setFontSize(24);
            rightCardTitle.setFontWeight(800);
            rightCardTitle.setSize(170, 38);
            rightCardTitle.setPosition(268, -102);
            rightCardTitle.setFill('#e2e8f0');
            layerWorld.addNode(rightCardTitle);

            const leftToCenter = new NodeLine(nextNodeId++);
            leftToCenter.setStart({ x: 0, y: 0 });
            leftToCenter.setEnd({ x: 170, y: 0 });
            leftToCenter.setPosition(-126, -22);
            leftToCenter.setStrokeFill('#94a3b8');
            leftToCenter.setStrokeThickness(6);
            layerWorld.addNode(leftToCenter);

            const centerToRight = new NodeLine(nextNodeId++);
            centerToRight.setStart({ x: 0, y: 0 });
            centerToRight.setEnd({ x: 170, y: 0 });
            centerToRight.setPosition(142, -22);
            centerToRight.setStrokeFill('#94a3b8');
            centerToRight.setStrokeThickness(6);
            layerWorld.addNode(centerToRight);

            const centerHub = new NodeEllipse(nextNodeId++);
            centerHub.setSize(160, 160);
            centerHub.setPosition(0, 132);
            centerHub.setFill('#0ea5e9');
            centerHub.setStrokeFill('#ffffff');
            centerHub.setStrokeWidth({ t: 4, r: 4, b: 4, l: 4 });
            layerWorld.addNode(centerHub);

            const hubLabel = new NodeText(nextNodeId++);
            hubLabel.setText('Canvas');
            hubLabel.setFontSize(24);
            hubLabel.setFontWeight(800);
            hubLabel.setSize(220, 42);
            hubLabel.setPosition(0, 132);
            hubLabel.setFill('#ffffff');
            layerWorld.addNode(hubLabel);

            const downLinkLeft = new NodeLine(nextNodeId++);
            downLinkLeft.setStart({ x: 0, y: 0 });
            downLinkLeft.setEnd({ x: -170, y: 130 });
            downLinkLeft.setPosition(-8, 24);
            downLinkLeft.setStrokeFill('#e2e8f0');
            downLinkLeft.setStrokeThickness(6);
            layerWorld.addNode(downLinkLeft);

            const downLinkRight = new NodeLine(nextNodeId++);
            downLinkRight.setStart({ x: 0, y: 0 });
            downLinkRight.setEnd({ x: 170, y: 130 });
            downLinkRight.setPosition(8, 24);
            downLinkRight.setStrokeFill('#e2e8f0');
            downLinkRight.setStrokeThickness(6);
            layerWorld.addNode(downLinkRight);

            const starNode = new NodeStar(nextNodeId++);
            starNode.setSize(118, 118);
            starNode.setPosition(322, 142);
            starNode.setFill('#f59e0b');
            starNode.setStrokeFill('#ffffff');
            starNode.setStrokeWidth({ t: 4, r: 4, b: 4, l: 4 });
            starNode.setRotation(Math.PI / 9);
            layerWorld.addNode(starNode);

            const titleNode = new NodeText(nextNodeId++);
            titleNode.setText('Flowscape Composition');
            titleNode.setFontSize(42);
            titleNode.setFontWeight(800);
            titleNode.setSize(760, 64);
            titleNode.setPosition(0, -178);
            titleNode.setFill('#ffffff');
            layerWorld.addNode(titleNode);

            const hintNode = new NodeText(nextNodeId++);
            hintNode.setText('Pick a tool in the toolbar and add your own shapes');
            hintNode.setFontSize(21);
            hintNode.setFontWeight(600);
            hintNode.setSize(820, 40);
            hintNode.setPosition(0, -130);
            hintNode.setFill('#cbd5e1');
            layerWorld.addNode(hintNode);
        };
        seedInitialContent();

        const camera = layerWorld.camera;
        camera.setScale(0.50);
        scene.invalidate();

        const onStagePointerDown = (event: PointerEvent) => {
            if (event.button !== 0) {
                return;
            }

            const tool = activeToolRef.current;
            if (tool === 'move') {
                return;
            }

            setTool('move');
            const stagePoint = toStagePoint(event.clientX, event.clientY);
            const worldPoint = layerWorld.camera.screenToWorld(stagePoint);
            createNodeAt(tool, worldPoint.x, worldPoint.y);
            scene.invalidate();
        };
        stageSurface.addEventListener('pointerdown', onStagePointerDown);

        const resizeObserver = new ResizeObserver(() => {
            const width = mount.clientWidth;
            const currentHeight = mount.clientHeight;
            scene.setSize(width, currentHeight);
            scene.invalidate();
        });
        resizeObserver.observe(mount);

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
        };
        mount.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            resizeObserver.disconnect();
            stageSurface.removeEventListener('pointerdown', onStagePointerDown);
            mount.removeEventListener('wheel', onWheel);
            scene.inputManager.remove(worldInputController.id);
            scene.inputManager.remove(overlayInputController.id);
            scene.removeHost(-1);
        };
    }, [backgroundFill, logoUrl]);

    return (
        <div
            className={clsx(
                styles.editorRoot,
                activeTool !== 'move' && styles.editorRootInsertMode,
                className,
            )}
            style={{
                height
            }}
        >
            <div ref={mountRef} className={styles.editorMount} />
            <div className={styles.editorToolbar}>
                {TOOLBAR_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={clsx(
                            styles.toolbarButton,
                            activeTool === item.id && styles.toolbarButtonActive,
                        )}
                        onClick={() => {
                            setTool(item.id);
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function FlowscapeEditor({
    className = '',
    height = 520,
    backgroundFill = '#1E1E1E',
    logoUrl = logoDefaultUrl,
}: FlowscapeEditorProps) {
    return (
        <BrowserOnly>
            {() => (
                <FlowscapeEditorInner
                    className={className}
                    height={height}
                    backgroundFill={backgroundFill}
                    logoUrl={logoUrl}
                />
            )}
        </BrowserOnly>
    );
}


