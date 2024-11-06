import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Injectable({
  providedIn: 'root'
})
export class ObstacleFormService {
  private formGroup: FormGroup;
  private formChanges$ = new Subject<Obstacle>();

  constructor(private formBuilder: FormBuilder) {
    // Initialize the form group with validators
    this.formGroup = this.formBuilder.group({
      x: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      y: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      width: ['', [Validators.required, Validators.min(1)]],
      height: ['', [Validators.required, Validators.min(1)]],
      color: [''],
    });

    // Subscribe to form value changes and emit through Subject
    this.formGroup.valueChanges.subscribe(value => {
      this.formChanges$.next(value);
    });
  }

  // Provide method to get the form group
  getForm(): FormGroup {
    return this.formGroup;
  }

  // Provide method to get an Observable of form changes
  getFormChanges(): Observable<Obstacle> {
    return this.formChanges$.asObservable();
  }

  // Populate the form with given obstacle values
  populateForm(obstacle: Obstacle): void {
    this.formGroup.setValue({
      x: obstacle.x.toString(),
      y: obstacle.y.toString(),
      width: obstacle.width.toString(),
      height: obstacle.height.toString(),
      color: obstacle.color || '',
    });
  }

  // Patch the form with partial values
  patchFormValue(values: Partial<Obstacle>): void {
    this.formGroup.patchValue({
      x: values.x?.toString(),
      y: values.y?.toString(),
      width: values.width?.toString(),
      height: values.height?.toString(),
      color: values.color || '',
    });
  }
  
  // Reset the form to initial state
  resetForm(): void {
    this.formGroup.reset();
  }
}
