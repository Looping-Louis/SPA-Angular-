/// <reference types="jasmine" />
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth.service';

describe('AppComponent', () => {
  let authStub: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authStub = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'logout']);
    (authStub.isLoggedIn as jasmine.Spy).and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [AppComponent], // oder declarations: [AppComponent] bei älteren Projekten
      providers: [
        provideRouter([]), // oder RouterTestingModule.withRoutes([]) bei älteren Projekten
        { provide: AuthService, useValue: authStub }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    authStub.isLoggedIn.calls.reset();
    authStub.logout.calls.reset();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('hides the topbar when the user is logged out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.topbar')).toBeNull();
  });
});
