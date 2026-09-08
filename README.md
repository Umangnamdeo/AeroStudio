# Automotive Aerodynamics Platform

A high-performance, browser-based virtual wind tunnel and aerodynamic simulation platform tailored for motorsport and automotive engineering. Built with **Next.js**, **React**, **Three.js**, **WebGPU / WebGL2**, **TypeScript**, and the **Web Audio API**.

---

## 🏎️ Overview

The **Automotive Aerodynamics Platform** provides an interactive digital wind tunnel testing environment directly in the browser. It enables aerodynamicists, motorsport engineers, and vehicle designers to evaluate aerodynamic behavior, surface pressure distributions, boundary layer development, wake vortex structures, and aeroacoustics on production cars, GT racers, and prototype geometries.

---

## ⚡ Core Capabilities

### 1. Dynamic Virtual Wind Tunnel
- **Enclosure Geometry**: Full-scale 22m test section with boundary layer suction plates and precision engineering metric floor grid.
- **Upstream Flow Generator**:
  - **Pipeline Manifold Rake**: Configurable multi-nozzle smoke rake with lateral transverse traverse ($X$) and elevation height ($Y$).
  - **Industrial Jet Turbofan**: Authentic annular turbomachine nacelle with counter-rotating fan blades synced to velocity.
  - **Calibrated Inlet Distance**: Standardized 3.5m upstream discharge distance for natural stagnation and boundary-layer development.
- **Turntable Yaw Simulation**: Continuous $\pm 30^\circ$ yaw angle of attack rotation for side-wind stability and cross-flow analysis.

### 2. Physical Streamlines & Particle Wake Dynamics
- **Adaptive RK2 Numerical Integration**: 2nd-Order Runge-Kutta stream tracer solving for local velocity vectors $V(x, y, z, t)$ conforming to the vehicle geometry envelope.
- **1.0 Hz Periodic Recalibration Engine**: Re-evaluates streamline paths every 1.0s to simulate unsteady vortex shedding and flow detachment.
- **Continuous In-Place GPU Vertex Morphing**: Employs $C^1$ continuous relaxation between recalibrated states without mesh deallocations, guaranteeing smooth 60–120 FPS performance.
- **Volumetric Wake Cloud**: Multi-emitter turbulent wake particles simulating diffuse oil smoke recirculations behind the rear spoiler, roofline, and underbody diffuser.

### 3. High-Speed Rolling Road (Moving Ground Plane)
- **Treadmill Synchronization**: Synchronizes ground belt velocity ($V_{\text{belt}} = V_\infty$) with wind tunnel airspeed up to 320 km/h.
- **Configurations**: Support for Wide Single Belt, Center Chassis Belt, and 5-Belt Systems (isolated wheel drive pads).
- **Chassis Aero Dynamics**: Dynamic downforce-dependent suspension squat, front pitch under braking, and high-speed ride height variations.
- **Synchronized Wheel Rotation**: Dynamic angular velocity $\omega = \frac{v}{r_{\text{wheel}}}$ for authentic rolling wheel drag wake simulation.

### 4. Procedural Wind Tunnel Aeroacoustics Audio Engine
- **Web Audio API Synthesis**: Real-time multi-node procedural sound generation without static audio files.
- **Dynamic Pitch & Pressure Scaling**:
  - Low-frequency turbulent rumble filter cutoff ($80\text{ Hz} \to 950\text{ Hz}$) scaling with dynamic pressure $q = \frac{1}{2}\rho v^2$.
  - High-frequency boundary layer shearing air hiss ($220\text{ Hz} \to 2100\text{ Hz}$).
  - Turbomachinery blade-pass whine ($55\text{ Hz} \to 680\text{ Hz}$) matching fan RPM.
  - Gust buffeting LFO modulation responding to turbulence levels.
- **Interactive Audio Controls**: Master mute/unmute and volume controls integrated into the header bar, sidebar, and HUD overlay.

### 5. Interactive Vehicle Telemetry & Ingestion
- **Custom 3D CAD Ingestion**: Native client-side support for `.stl`, `.obj`, `.gltf`, and `.glb` files with automatic geometric envelope bounding box calculation, frontal area computation ($A$), and center-of-pressure alignment.
- **Preloaded Calibration Benchmark**: High-downforce modern GT racecraft model.
- **Analytical Aerodynamic HUD**: Real-time computation of dynamic pressure ($q$), estimated drag force ($F_d$), aerodynamic horsepower consumption ($P_d$), downforce coefficient ($C_l$), and Reynolds number approximation.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **3D Graphics**: [Three.js](https://threejs.org/) & [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
- **Hardware Acceleration**: WebGPU Compute / WebGL2 via Three.js hardware pipeline
- **Audio**: Web Audio API (Procedural BiquadFilter, Oscillator, and Pink Noise synthesis)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Modern browser with WebGL2 / WebGPU support (Chrome 113+, Edge 113+, Safari 18+, Firefox 125+)

### Installation
```bash
npm install
# or
bun install
```

### Running Locally
```bash
npm run dev
# or
bun dev
```

Navigate to `http://localhost:3000` to access the virtual wind tunnel.

---

## 📐 Keyboard Navigation & Shortcuts

| Key | Action |
|---|---|
| `W` / `↑` | Increase Wind Speed (+10 km/h) |
| `S` / `↓` | Decrease Wind Speed (-10 km/h) |
| `A` / `←` | Yaw Left (+2.5°) |
| `D` / `→` | Yaw Right (-2.5°) |
| `1` - `5` | Camera Presets (Isometric, Side Profile, Frontal Stagnation, Top Planform, Rear Diffuser) |
| `Space` | Center Yaw Angle (0°) |
| `M` | Toggle Aeroacoustics Audio (Mute / Unmute) |

---

## 📜 Scientific & Engineering Notice

This software provides **approximate virtual wind tunnel simulation and aerodynamic flow visualization** using Runge-Kutta numerical integration (RK2), empirical boundary layer formulation, and real-time GPU shaders. It is intended for interactive design evaluation, conceptual aerodynamic studies, and educational visualization. For mission-critical homologation or production sign-off, results should be cross-validated against validated high-fidelity Navier-Stokes CFD solvers (OpenFOAM, Star-CCM+, Ansys Fluent) or physical scale-model wind tunnel testing.
