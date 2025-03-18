import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule], // Import RouterModule
  templateUrl: './app.component.html'
})

export class AppComponent {
  title = 'Gung Product List';
}