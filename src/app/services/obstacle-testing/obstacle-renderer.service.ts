import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Injectable({
  providedIn: 'root',
})
export class ObstacleRendererService {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FreeCamera;
  private light: BABYLON.HemisphericLight;

  constructor() {}

  initializeRenderer(canvas: HTMLCanvasElement): void {
    // Create Babylon.js engine and scene
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    // Create a basic camera and light
    this.camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), this.scene);
    this.camera.setTarget(BABYLON.Vector3.Zero());
    this.light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), this.scene);
    
    // Set the light intensity
    this.light.intensity = 0.7;

    // Render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  // Method to create 3D obstacles from 2D data
  create3DObstacles(obstacles: Obstacle[]): void {
    obstacles.forEach(obstacle => {
      const box = BABYLON.MeshBuilder.CreateBox(`box-${obstacle.id}`, {
        width: obstacle.width,
        height: obstacle.height,
        depth: obstacle.width / 2, // Adjust for a 3D depth dimension
      }, this.scene);

      // Position and color the box
      box.position = new BABYLON.Vector3(obstacle.x, obstacle.y, 0);
      const material = new BABYLON.StandardMaterial(`mat-${obstacle.id}`, this.scene);
      material.diffuseColor = BABYLON.Color3.FromHexString(obstacle.color);
      box.material = material;
    });
  }

  dispose(): void {
    if (this.engine) {
      this.engine.dispose();
    }
  }
}
