import { Component } from '@angular/core';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth.service';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AppComponent', () => {
  const authStub = {
    isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
    logout: jasmine.createSpy('logout'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'impressum', component: DummyComponent },
          { path: 'vault', component: DummyComponent },
          { path: 'totp-setup', component: DummyComponent }
        ], withDisabledInitialNavigation()),
        { provide: AuthService, useValue: authStub }
      ]
    }).compileComponents();
    authStub.isLoggedIn.and.returnValue(false);
  });

  afterEach(() => {
    authStub.isLoggedIn.calls.reset();
    authStub.logout.calls.reset();
    authStub.isLoggedIn.and.returnValue(false);
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('hides the topbar when the user is logged out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar')).toBeNull();
  });

  it('shows the topbar when the user is logged in', fakeAsync(() => {
    authStub.isLoggedIn.and.returnValue(true);
    const fixture = TestBed.createComponent(AppComponent);
    tick();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar')).not.toBeNull();
  }));

  it('renders the legal footer link', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    tick();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const footerLink = compiled.querySelector<HTMLAnchorElement>('.legal-footer a');
    expect(footerLink?.textContent?.trim()).toBe('Impressum');
    expect(footerLink?.getAttribute('href') ?? '').toContain('/impressum');
  }));
});
