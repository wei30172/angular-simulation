import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { Subscription } from 'rxjs';
import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { Obstacle } from './obstacle.model';

@Component({
  selector: 'app-obstacle-3d',
  templateUrl: './obstacle-3d.component.html',
  styleUrls: ['./obstacle-3d.component.scss']
})
export class Obstacle3DComponent implements OnInit, OnDestroy {
  @ViewChild('babylonCanvas', { static: true }) babylonCanvas: ElementRef<HTMLCanvasElement>;

  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.ArcRotateCamera;
  private obstacleSubscription: Subscription;

  // Background image URL for 3D ground texture
  private readonly BACKGROUND_IMAGE_URL = 'assets/images/floorplan.jpg';
  private readonly GROUND_SIZE = 640; // Ground size based on 2D canvas size
  private readonly OBSTACLE_HEIGHT = 50; // Fixed height for all obstacles

  constructor(private obstacleService: ObstacleGenerationService) {}

  ngOnInit() {
    this.initBabylonEngine(); // Initialize BABYLON engine and scene
    this.loadBackgroundImage(); // Load background image as ground texture

    // Subscribe to obstacles data from ObstacleGenerationService
    this.obstacleSubscription = this.obstacleService.obstacles$.subscribe(obstacles => {
      this.clearObstacles(); // Clear previous obstacles from the scene
      obstacles.forEach(obstacle => this.create3DObstacle(obstacle)); // Render each obstacle in 3D
    });

    // Generate random obstacles initially
    this.obstacleService.generateRandomObstacles(20, this.GROUND_SIZE, this.GROUND_SIZE);
  }

  ngOnDestroy() {
    this.engine.dispose(); // Clean up BABYLON engine resources
    this.obstacleSubscription.unsubscribe(); // Unsubscribe from obstacles data
  }

  // Initialize BABYLON engine, scene, and camera
  private initBabylonEngine() {
    const canvas = this.babylonCanvas.nativeElement;
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    // Set up camera
    this.camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 800, new BABYLON.Vector3(0, 0, 0), this.scene);
    this.camera.attachControl(canvas, true);

    // Add a light source
    const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;

    // Start rendering loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  // Load a background image as a ground texture in 3D scene
  private loadBackgroundImage() {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: this.GROUND_SIZE, height: this.GROUND_SIZE }, this.scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);

    const texture = new BABYLON.Texture(this.BACKGROUND_IMAGE_URL, this.scene);
    texture.uScale = -1;
    texture.vScale = -1;
    groundMaterial.diffuseTexture = texture;

    ground.material = groundMaterial;
    ground.position.y = 0; // Ensure ground is at zero level
  }

  // Clear previously rendered obstacles from the scene
  private clearObstacles() {
    const obstaclesMeshes = this.scene.meshes.filter(mesh => mesh.name.startsWith('obstacle-'));
    obstaclesMeshes.forEach(mesh => mesh.dispose());
  }

  // Create a 3D representation of the obstacle with aligned positioning
  private create3DObstacle(obstacle: Obstacle) {
    // Create a box for each obstacle with specified width, height, and fixed depth
    const box = BABYLON.MeshBuilder.CreateBox(`obstacle-${obstacle.id}`, {
      width: obstacle.width,
      depth: obstacle.height,
      height: this.OBSTACLE_HEIGHT,
    }, this.scene);

    // Position the box to align with 2D coordinates
    const halfGroundSize = this.GROUND_SIZE / 2;
    box.position.x = obstacle.x - halfGroundSize + obstacle.width / 2; // Center on the ground
    box.position.z = halfGroundSize - obstacle.y - obstacle.height / 2; // Adjust to match 2D coordinates
    box.position.y = this.OBSTACLE_HEIGHT / 2; // Place obstacle at ground level
    // box.rotation.y = BABYLON.Angle.FromDegrees(obstacle.rotationAngle).radians();

    // Apply material with the specified color
    const material = new BABYLON.StandardMaterial(`material-${obstacle.id}`, this.scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(obstacle.color);
    box.material = material;
  }
}