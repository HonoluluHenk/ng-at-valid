import {fakeAsync, tick} from '@angular/core/testing';
import {FormBuilder, FormGroup} from '@angular/forms';
import {DEFAULT_GROUP} from 'at-valid/lib/decorators';
import {isEmpty} from 'at-valid/lib/util/isEmpty';
import {Opts, ValidationContext} from 'at-valid/lib/validator/ValidationContext';
import {AtValidFormBuilder} from './at-valid-form-builder';

const OTHER_GROUP = 'OTHER_GROUP';

function expectError(propertyKey: string, validatorName: string, value: string | null | undefined) {
    return {
        [propertyKey]: {
            propertyKey,
            value,
            path: `$.${propertyKey}`,
            validatorName,
            validatorFnContext: {
                customContext: {}, args: {}
            }
        }
    };
}

function nameError(value: string | null | undefined): object {
    return expectError('name', 'A', value);
}

function surnameError(value: string | null | undefined): object {
    return expectError('surname', 'B', value);
}

function locationError(value: string | null | undefined): object {
    return expectError('location', 'C', value);
}

describe('AtValidFormBuilder', () => {
    let calls: Array<{ prop: string, validator: string, value: string | null | undefined, outcome: boolean }> = [];

    let aSpy: jasmine.Spy<() => boolean> = jasmine.createSpy('A');
    let bSpy: jasmine.Spy<() => boolean> = jasmine.createSpy('B');
    let cSpy: jasmine.Spy<() => boolean> = jasmine.createSpy('C');

    function resetCalls() {
        calls = [];
    }

    function resetSpies(a: boolean, b?: boolean, c?: boolean) {
        aSpy = jasmine.createSpy('A');
        bSpy = jasmine.createSpy('B');
        cSpy = jasmine.createSpy('C');
        const bb = isEmpty(b) ? a : b;
        const cc = isEmpty(c) ? bb : c;
        aSpy.and.returnValue(a);
        bSpy.and.returnValue(bb);
        cSpy.and.returnValue(cc);
    }

    function LoggingConstraint(
        name: string,
        fn: () => boolean,
        opts?: Opts
    ): (target: object, propertyKey: string) => void {

        return (target: object, propertyKey: string) => {
            const registerCall = (value: any) => {
                const outcome = fn();
                // console.log('registerCall called', value, ctx, inst);
                calls.push({prop: propertyKey, validator: name, value, outcome});

                return outcome;
            };

            ValidationContext.instance.registerPropertyValidator({
                name,
                target,
                propertyKey,
                messageArgs: {},
                validatorFn: registerCall,
                opts
            });
        };
    }

    class Data {

        static withAll(values: string | null): Data {
            return new Data(values, values, values);
        }

        @LoggingConstraint('A', () => aSpy())
        name: string | null;

        @LoggingConstraint('B', () => bSpy(), {groups: [OTHER_GROUP]})
        surname: string | null;

        @LoggingConstraint('C', () => cSpy(), {groups: [DEFAULT_GROUP, OTHER_GROUP]})
        location: string | null;

        constructor(name: string | null, surname: string | null, location: string | null) {
            this.name = name;
            this.surname = surname;
            this.location = location;
        }
    }

    let fb: AtValidFormBuilder;

    beforeEach(() => {
        fb = new AtValidFormBuilder(new FormBuilder());
    });

    describe('initial state', () => {
        let form: FormGroup;

        beforeEach(() => {
            resetSpies(true);
            resetCalls();
            form = fb.groupFrom(Data);
        });

        it('should be called with angular default values (i.e.: null)', () => {
            expect(calls)
                .toEqual([
                    {prop: 'name', validator: 'A', value: null, outcome: true},
                    // {prop: 'surname', validator: 'B', value: null, outcome: true},
                    {prop: 'location', validator: 'C', value: null, outcome: true},
                ]);
        });

        it('should be initially invalid', () => {
            expect(form.valid)
                .toBeFalsy();
        });

        it('should be initially pristine', () => {
            expect(form.pristine)
                .toBeTruthy();
        });
    });

    [
        {
            outcome: true,
            group: DEFAULT_GROUP,
            value: 'ignored',
            expected: {
                calls: [
                    {prop: 'name', validator: 'A', value: 'ignored', outcome: true},
                    // {prop: 'surname', validator: 'B', value: 'ignored', outcome: true},
                    {prop: 'location', validator: 'C', value: 'ignored', outcome: true},
                ],
                formPristine: true,
                formValid: true,
                nameError: null,
                surnameError: null,
                locationError: null
            }
        },
        {
            outcome: false,
            group: DEFAULT_GROUP,
            value: 'ignored',
            expected: {
                calls: [
                    {prop: 'name', validator: 'A', value: 'ignored', outcome: false},
                    // {prop: 'surname', validator: 'B', value: 'ignored', outcome: false},
                    {prop: 'location', validator: 'C', value: 'ignored', outcome: false},
                ],
                formPristine: true,
                formValid: false,
                nameError: nameError('ignored'),
                surnameError: null,
                locationError: locationError('ignored')
            }
        },
        {
            outcome: true,
            group: OTHER_GROUP,
            value: 'ignored',
            expected: {
                calls: [
                    // {prop: 'name', validator: 'A', value: 'ignored', outcome: true},
                    {prop: 'surname', validator: 'B', value: 'ignored', outcome: true},
                    {prop: 'location', validator: 'C', value: 'ignored', outcome: true},
                ],
                formPristine: true,
                formValid: true,
                nameError: null,
                surnameError: null,
                locationError: null
            }
        },
        {
            outcome: false,
            group: OTHER_GROUP,
            value: 'ignored',
            expected: {
                calls: [
                    // {prop: 'name', validator: 'A', value: 'ignored', outcome: false},
                    {prop: 'surname', validator: 'B', value: 'ignored', outcome: false},
                    {prop: 'location', validator: 'C', value: 'ignored', outcome: false},
                ],
                formPristine: true,
                formValid: false,
                nameError: null,
                surnameError: surnameError('ignored'),
                locationError: locationError('ignored')
            }
        },
    ].forEach(param => {
        describe(`reset() with outcome: ${param.outcome} in ${param.group}`, () => {
            let form: FormGroup;
            let data: Data;

            beforeEach(fakeAsync(() => {
                resetSpies(param.outcome);
                form = fb.groupFrom(Data, {group: param.group});

                // fail all validations
                resetCalls();
                data = Data.withAll(param.value);

                form.reset(data);
                tick();
            }));

            it('should call validators on properties for current group', () => {
                expect(calls)
                    .toEqual(param.expected.calls);
            });

            it('should set form validation status', () => {
                expect(form.valid)
                    .toEqual(param.expected.formValid);
            });

            it('should set form pristine status', () => {
                expect(form.pristine)
                    .toEqual(param.expected.formPristine);
            });

            it('should set item validation status', () => {
                expect(form.controls.name.valid)
                    .toEqual(param.expected.nameError === null);
                expect(form.controls.surname.valid)
                    .toEqual(param.expected.surnameError === null);
                expect(form.controls.location.valid)
                    .toEqual(param.expected.locationError === null);
            });

            it('should produce a nice name error', () => {
                expect(form.controls.name.errors)
                    .toEqual(param.expected.nameError);
            });
            it('should produce a nice surname error', () => {
                expect(form.controls.surname.errors)
                    .toEqual(param.expected.surnameError);
            });
            it('should produce a nice location error', () => {
                expect(form.controls.location.errors)
                    .toEqual(param.expected.locationError);
            });
        });
    });

    describe('updating an invalid form control value', () => {

        let form: FormGroup;
        let data: Data;

        beforeEach(fakeAsync(() => {
            resetSpies(false);

            form = fb.groupFrom(Data);

            data = Data.withAll(null);
            form.reset(data);
            tick();
            resetCalls();

            form.controls.name.setValue('Duck');
            form.controls.surname.setValue('Donald');
            form.controls.location.setValue('Entenhausen');
            tick();
        }));

        it(`should call only the validators for group: DEFAULT_GROUP`, () => {
            expect(calls)
                .toEqual([
                    {prop: 'name', validator: 'A', value: 'Duck', outcome: false},
                    // {prop: 'surname', validator: 'B', value: 'Donald', outcome: false},
                    {prop: 'location', validator: 'C', value: 'Entenhausen', outcome: false},
                ]);
        });

        it('should update the name control value', fakeAsync(() => {
            expect(form.controls.name.value)
                .toEqual('Duck');
        }));

        it('should push the new name value to the model', fakeAsync(() => {
            expect(data.name)
                .toEqual('Duck');
        }));

        it('should update the surname control value', fakeAsync(() => {
            expect(form.controls.surname.value)
                .toEqual('Donald');
        }));

        it('should push the new surname value to the model', fakeAsync(() => {
            expect(data.surname)
                .toEqual('Donald');
        }));

        it('should update the location control value', fakeAsync(() => {
            expect(form.controls.location.value)
                .toEqual('Entenhausen');
        }));

        it('should push the new location value to the model', fakeAsync(() => {
            expect(data.location)
                .toEqual('Entenhausen');
        }));
    });
});
