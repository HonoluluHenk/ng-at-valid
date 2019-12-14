import {Component} from '@angular/core';
import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {BrowserTestingModule} from '@angular/platform-browser/testing';
import {MinLength, Required} from 'at-valid/lib/decorators';
import {AtValidFormBuilder} from './at-valid-form-builder';

describe('AngularIntegration', () => {
    let fixture: ComponentFixture<TestComponent>;
    let component: TestComponent;

    class Data {
        @Required()
        @MinLength()
        name?: string;
    }

    @Component({
        template: "<form [formGroup]='form'><input name='name' formControlName='name'/></form>"
    })
    class TestComponent {
        readonly form: FormGroup;

        constructor(fb: FormBuilder) {
            this.form = new AtValidFormBuilder(fb).groupFrom(Data);
        }
    }

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TestComponent],
            imports: [BrowserTestingModule, ReactiveFormsModule],
            providers: [{
                provide: FormBuilder,
                useValue: new FormBuilder()
            }]
        })
            .compileComponents();
    }));

    it(`should instantiate`, () => {
        fixture = TestBed.createComponent(TestComponent);
        component = fixture.debugElement.componentInstance;
        fixture.detectChanges();

        expect(component)
            .toBeTruthy();
    });

    describe('created', () => {

        beforeEach(async(() => {
            fixture = TestBed.createComponent(TestComponent);
            component = fixture.debugElement.componentInstance;
            fixture.detectChanges();
        }));

        it('should allow setting a valid value', fakeAsync(() => {
            component.form.reset({name: 'Hello'});

            fixture.detectChanges();
            tick();

            expect(component.form.valid)
                .toEqual(true);
        }));

        describe('with invalid value set', () => {
            beforeEach(fakeAsync(() => {
                component.form.reset({});

                fixture.detectChanges();
                tick();
            }));

            it('should fail validation', async(() => {
                expect(component.form.valid)
                    .toEqual(false);
            }));

            it('should provide an error message', async(() => {
                expect(component.form.get('name')!.errors)
                    .toEqual({
                            name: {
                                path: '$.name',
                                propertyKey: 'name',
                                validatorFnContext: {args: {}, customContext: {}},
                                validatorName: 'Required',
                                value: null
                            }
                        }
                    );
            }));
        });

    });
});
