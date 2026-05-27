import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const VoiceOrb = ({ isUserTalking, isAiTalking }) => {
    const mountRef = useRef(null);
    const audioLevelRef = useRef(0);
    const targetAudioLevelRef = useRef(0);

    useEffect(() => {
        if (!mountRef.current) return;

        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        container.style.pointerEvents = 'none'; // Ensure canvas never blocks clicks

        // SCENE & CAMERA
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 9;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        container.appendChild(renderer.domElement);

        // REALISTIC SHINE (RoomEnvironment)
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        // SCENE LIGHTS
        const light1 = new THREE.PointLight(0xff0055, 50);
        scene.add(light1);

        const light2 = new THREE.PointLight(0x0055ff, 50);
        scene.add(light2);

        const light3 = new THREE.PointLight(0x55ff00, 50);
        scene.add(light3);

        // OUTER GLASS SPHERE (PERFECT SOAP BUBBLE)
        // Matches the exact rainbow thin-film interference seen in the reference image
        const outerSphere = new THREE.Mesh(
            new THREE.SphereGeometry(3, 128, 128),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 0.1,
                roughness: 0,
                transmission: 1.0, // Fully glassy
                ior: 1.05, // Very low IOR like a thin bubble, minimal distortion of the core
                thickness: 0.05, // Thin wall
                iridescence: 1.0, // Maximum rainbow effect
                iridescenceIOR: 1.33, // Water/soap IOR
                iridescenceThicknessRange: [200, 400], // Creates the thick rainbow gradient on the edges
                transparent: true,
                opacity: 1.0,
                envMapIntensity: 2.0,
                side: THREE.DoubleSide, // Renders both inside and outside reflections for maximum realism
                depthWrite: false // Ensures inner core renders perfectly through the bubble
            })
        );
        scene.add(outerSphere);
        // Removed the artificial shineSphere rims completely!

        // INNER BLACK LIQUID CORE
        const innerCoreGeometry = new THREE.SphereGeometry(1.4, 64, 64);
        
        // Store original vertices for liquid ripple math
        const positionAttribute = innerCoreGeometry.attributes.position;
        const vertexData = [];
        for (let i = 0; i < positionAttribute.count; i++) {
            vertexData.push(new THREE.Vector3().fromBufferAttribute(positionAttribute, i));
        }

        const innerCore = new THREE.Mesh(
            innerCoreGeometry,
            new THREE.MeshPhysicalMaterial({
                color: 0x000000, // Absolute pure glossy black
                roughness: 0.1,
                metalness: 0.8,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                envMapIntensity: 3.0 // Very reflective
            })
        );
        scene.add(innerCore);

        // ANIMATION LOOP
        let animationFrameId;
        let time = 0;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            time += 0.015;

            // Orbiting colorful lights
            light1.position.x = Math.sin(time * 0.7) * 5;
            light1.position.y = Math.cos(time * 0.5) * 5;
            light1.position.z = Math.cos(time * 0.3) * 5;
            light1.color.setHSL((time * 0.1) % 1, 0.8, 0.6);

            light2.position.x = Math.cos(time * 0.3) * 5;
            light2.position.y = Math.sin(time * 0.5) * 5;
            light2.position.z = Math.sin(time * 0.7) * 5;
            light2.color.setHSL((time * 0.1 + 0.33) % 1, 0.8, 0.6);

            light3.position.x = Math.sin(time * 0.5) * 5;
            light3.position.y = Math.cos(time * 0.3) * 5;
            light3.position.z = Math.sin(time * 0.7) * 5;
            light3.color.setHSL((time * 0.1 + 0.66) % 1, 0.8, 0.6);

            if (container) {
                container.style.filter = 'none';
            }

            // Inner core rotation
            innerCore.rotation.x += 0.005;
            innerCore.rotation.y += 0.008;

            // Smoothly interpolate audioLevel towards targetAudioLevel
            audioLevelRef.current += (targetAudioLevelRef.current - audioLevelRef.current) * 0.1;

            const pulse = 1 + audioLevelRef.current * 0.25;

            // Organic liquid vertex ripples (huge amorphous blobs)
            const timeScaled = time * 2.5;
            // Massive deformation intensity (base 0.15, peaks to 0.6+ during talking)
            const rippleIntensity = 0.15 + audioLevelRef.current * 0.45; 
            
            for (let i = 0; i < positionAttribute.count; i++) {
                const v = vertexData[i];
                // Lower frequency (0.8, 1.1) for massive, sweeping tendril-like stretches
                const wave1 = Math.sin(v.x * 0.8 + timeScaled) * rippleIntensity;
                const wave2 = Math.cos(v.y * 1.1 + timeScaled * 0.8) * rippleIntensity;
                const wave3 = Math.sin(v.z * 0.9 + timeScaled * 1.2) * rippleIntensity;
                
                // Extra high-frequency micro-ripples when talking
                const talkRipples = audioLevelRef.current * Math.sin(v.x * 3.0 - timeScaled * 2.0) * 0.05;
                
                // Prevent vertices from inverting through the center (clamp min to 0.1)
                const displacement = Math.max(0.1, 1.0 + wave1 + wave2 + wave3 + talkRipples);
                positionAttribute.setXYZ(i, v.x * displacement, v.y * displacement, v.z * displacement);
            }
            
            positionAttribute.needsUpdate = true;
            innerCore.geometry.computeVertexNormals(); // Crucial: recalculate normals so the glossy reflections warp over the ripples

            // Global scale scatter pulse (extreme squashing on separate axes)
            const wobbleX = 1 + Math.sin(time * 3.0) * 0.25;
            const wobbleY = 1 + Math.cos(time * 2.2) * 0.25;
            const wobbleZ = 1 + Math.sin(time * 1.7) * 0.25;
            innerCore.scale.set(pulse * wobbleX, pulse * wobbleY, pulse * wobbleZ);

            renderer.render(scene, camera);
        };

        animate();

        // RESIZE HANDLER (Optional since component has fixed size usually, but good practice)
        const handleResize = () => {
            if (!mountRef.current) return;
            const newW = mountRef.current.clientWidth;
            const newH = mountRef.current.clientHeight;
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        };
        window.addEventListener('resize', handleResize);

        // CLEANUP
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Update target audio level based on props
    useEffect(() => {
        if (isUserTalking || isAiTalking) {
            // Simulate random energetic audio levels when talking
            const interval = setInterval(() => {
                targetAudioLevelRef.current = Math.random() * 0.8 + 0.2;
            }, 100);
            return () => {
                clearInterval(interval);
                targetAudioLevelRef.current = 0;
            };
        } else {
            targetAudioLevelRef.current = 0;
        }
    }, [isUserTalking, isAiTalking]);

    return (
        <div 
            ref={mountRef} 
            className="organic-orb-container" 
            style={{ width: '300px', height: '300px' }} 
        />
    );
};

export default VoiceOrb;
