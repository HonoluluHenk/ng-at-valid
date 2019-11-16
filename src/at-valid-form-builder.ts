import {AbstractControl, AsyncValidatorFn, FormBuilder, FormControl, FormGroup, ValidationErrors} from '@angular/forms';
import {DEFAULT_GROUP} from 'at-valid/lib/decorators';
import {
    mapToValidationError,
    PROPERTY_ROOT_PATH,
    PropertyValidator,
    ValidationContext,
    ValidationOutcome
} from 'at-valid/lib/validator';

export interface Options {
    group?: string;
}

export interface TypedValue {
    [propertyKey: string]: any;
}

export class AtValidFormGroup<T extends TypedValue> extends FormGroup {
    private typedValue?: T;

    constructor() {
        super({});
    }

    setValue(value: T, options?: { onlySelf?: boolean; emitEvent?: boolean }): void {
        this.typedValue = value;

        super.setValue(value, options);
    }

    reset(value?: T, options?: { onlySelf?: boolean; emitEvent?: boolean }): void {
        this.typedValue = value;

        super.reset(value, options);
    }

    patchValue(value: T, options?: { onlySelf?: boolean; emitEvent?: boolean }): void {
        super.patchValue(value, options);
    }

    getTypedValue(): T | undefined {
        return this.typedValue;
    }
}

export class AtValidFormBuilder {
    constructor(readonly fb: FormBuilder) {

    }

    // tslint:disable-next-line:ban-types
    groupFrom(clazz: object | Function, options?: Options): FormGroup {
        const opts = parseOptions(options);
        const plan = ValidationContext.instance.buildExecutionPlan(clazz, [opts.group]);

        const groupPlan = plan.groups[opts.group];
        const formGroup = new AtValidFormGroup();

        // tslint:disable-next-line:forin
        for (const propertyKey in groupPlan.propertyValidators) {
            const propertyValidators = groupPlan.propertyValidators[propertyKey];
            const control = this.adaptValidators(propertyValidators, () => formGroup.getTypedValue() || {});

            // noinspection AssignmentResultUsedJS
            control.valueChanges
                .subscribe((next: any) => {
                    const objectInstance = formGroup.getTypedValue();
                    if (objectInstance) {
                        objectInstance[propertyKey] = next;
                    }
                    // console.log('value changed after: ', propertyKey, ' === ', next, 'value:',
                    // formGroup.getRawValue());
                });

            formGroup.addControl(propertyKey, control);
        }

        return formGroup;
    }

    private adaptValidators(
        validators: PropertyValidator[],
        instanceProvider: () => TypedValue
    ): FormControl {
        const asyncValidators: AsyncValidatorFn[] = validators.map(v => adaptValidator(v, instanceProvider));

        return this.fb.control(undefined, {
            asyncValidators
        });
    }

}

function adaptValidator(
    validator: PropertyValidator,
    instanceProvider: () => { [p: string]: any }
): AsyncValidatorFn {
    return control => {
        if (validator.validatorFn === 'NESTED') {
            // NESTED is not supported yet
            return Promise.resolve(null);
        }

        const validationResult: ValidationOutcome | Promise<ValidationOutcome> =
            validator.validatorFn(control.value, validator.validatorFnContext, instanceProvider());

        if (validationResult instanceof Promise) {
            return mapPromise(control, validator, validationResult);
        } else {
            const simpleResult: ValidationOutcome = validationResult;

            return Promise.resolve(mapValidationResult(control, validator, simpleResult));
        }
    };
}

function mapPromise(
    control: AbstractControl,
    validator: PropertyValidator,
    promise: Promise<ValidationOutcome>
): Promise<ValidationErrors | null> {
    return promise.then(result => Promise.resolve(mapValidationResult(control, validator, result)));
}

function buildFailureObject(
    control: AbstractControl,
    validator: PropertyValidator,
    outcome: ValidationOutcome
) {
    const result = mapToValidationError(
        outcome,
        control.value,
        validator,
        validator.validatorFnContext,
        PROPERTY_ROOT_PATH,
        undefined
    );

    // angular expectes null instead of undefined
    return result === undefined ? null : result;
}

function mapValidationResult(
    control: AbstractControl,
    validator: PropertyValidator,
    outcome: ValidationOutcome
): ValidationErrors | null {
    if (typeof outcome === 'boolean') {
        if (outcome) {
            return null;
        }
    }

    return {
        [validator.propertyKey]: buildFailureObject(control, validator, outcome)
    };
}

interface ParsedOptions {
    group: string;
}

function parseOptions(opts?: Options): ParsedOptions {
    const options = opts || {};

    return {
        group: options.group || DEFAULT_GROUP
    };
}
