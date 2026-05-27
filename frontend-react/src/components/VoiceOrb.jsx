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
        const light1 = new THREE.PointLight(0xff66ff, 30); // Increased
        light1.position.set(5, 5, 5);
        scene.add(light1);

        const light2 = new THREE.PointLight(0x3366ff, 30); // Increased
        light2.position.set(-5, -5, 5);
        scene.add(light2);

        const light3 = new THREE.PointLight(0xffffff, 10); // Increased
        light3.position.set(0, 0, 8);
        scene.add(light3);

        // OUTER GLASS SPHERE
        const outerSphere = new THREE.Mesh(
            new THREE.SphereGeometry(3, 128, 128),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.15, // Slightly more opaque for better reflections
                roughness: 0, 
                transmission: 1, 
                thickness: 2, 
                clearcoat: 1,
                clearcoatRoughness: 0,
                metalness: 0.2, // Increased metalness boosts shine
                reflectivity: 1,
                ior: 1.5,
                envMapIntensity: 3.5 // Heavily boosts the realistic studio reflections
            })
        );
        scene.add(outerSphere);

        // OUTER SHINE (RIM LIGHTING)
        const shineGeometry = new THREE.SphereGeometry(3.03, 64, 64); // Reduced from 3.15 to make border thinner
        const shineMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaddff, // Subtle blue/cyan tint for the rim
            transparent: true,
            opacity: 0.15, // More visible rim
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending // Makes the edges glow
        });
        const shineSphere = new THREE.Mesh(shineGeometry, shineMaterial);
        scene.add(shineSphere);

        // ANIMATION LOOP
        let animationFrameId;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Smoothly interpolate audioLevel towards targetAudioLevel
            audioLevelRef.current += (targetAudioLevelRef.current - audioLevelRef.current) * 0.1;

            const pulse = 1 + audioLevelRef.current * 0.25;

            // sphere pulse
            outerSphere.scale.set(pulse, pulse, pulse);
            shineSphere.scale.set(pulse, pulse, pulse);

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
