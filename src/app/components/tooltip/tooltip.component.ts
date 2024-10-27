import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { TooltipService } from 'src/app/services/obstacle-testing/tooltip.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
})
export class TooltipComponent implements OnInit {
  @ViewChild('tooltip') tooltipElement!: ElementRef<HTMLDivElement>;

  tooltip$: Observable<{
    title?: string;
    description?: string;
    style: { top: string; left: string; }
  } | null>;

  constructor(private tooltipService: TooltipService) {}

  ngOnInit() {
    this.tooltip$ = this.tooltipService.tooltip$;
  }
}