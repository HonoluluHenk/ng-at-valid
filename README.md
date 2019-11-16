![Logo of the project](logo.png)

# ng-at-valid
> Integrate [at-valid](https://github.com/HonoluluHenk/at-valid) validation decorators into Angular reactive forms validation

[at-valid](https://github.com/HonoluluHenk/at-valid) allows you to define decorators on your data classes for validation.

ng-at-valid uses these decorators to generate angular reactive forms with validation.

Added bonus: the values get written back to your data classes, no stupid manual mapping required!

Please note: all validations are registered as async validations.

```typescript
class MyClass {
    @Required()
    @MinLength(3)
    name: string = "";
}

class SomeComponent {
    private form: FormGroup;

    constructor(angularFb: FormBuilder) {
        this.form = new AtValidFormBuilder(formBuilder).groupFrom(MyClass);
        // validation groups are supported:
        this.form = new AtValidFormBuilder(formBuilder).groupFrom(MyClass, {group: 'FAST_VALIDATIONS'});

 
        // now you can just set/reset/patch values as usual:
        this.form.reset(new MyClass());
    }

    public onSubmit(): void {
        const myClass = this.form.getTypedValue();
        // and do your thing
        // please note: this is the same instance that was passed into form.reset()/form.setValue()
    }
    

}

```



TODO: link to the Angular FormBuilder adapter.



## Installing / Getting started

### Prerequisites

This package is implemented with ES2015 (see [caniuse.com]([https://caniuse.com/#search=es2015)) in mind and thus should be compatible with even IE11.

### Dependencies

* [uuid-validator](https://www.npmjs.com/package/uuid-validate) (if you're using the [IsUUID()](src/app/decorators/constraints/IsUUID.ts) constraint)

### Installation

NPM:

```shell
npm install --save at-valid
```



Yarn:

```shell
yarn add at-valid
```





# Usage

Validation on classes/properties just needs decorators on the properties you want to validate.

We'll call these decorators used for validation "constraints".



## Basic property validation

Add the desired decorators to the properties of your class (*Decorating properties defined in the constructor is not supported (yet) due to limitations of typescript!*).



**Important facts:** 

* By convention, all constraints treat `null` and `undefined` as valid values (in other words: optional values).
  To enforce a value, there is the `@Required()` decorator.
* Properties are validated independently of each other.
* All constraints per property are executed sequentially in the order they appear in the source (i.e.: top-down). This also holds for async constraints!.
  Constraint-execution for that property is stopped at the first error.



This makes declaring validation as easy as:

```typescript
class MyClass {
    // some optional property that - if there is a value - needs a minimum length of 3
    @MinLength(3)
    optionalProperty?: string;
    
    // this property is required and must evaluate to a number with a value >= 5
    @Required()
    @IsNumber()
    @Min(5)
    someValueFromAPI?: any;
}
```



To perform the actual validation:

```typescript
const fixture = new MyClass();

const result = await new DecoratorValidation().validate(fixture);

if (result.isError) {
    console.log('property validation errors: ', JSON.stringify(result.propertyErrors));   
}

// prints:
{
	"success": false,
	"propertyErrors": {
		"someValueFromAPI": {
			"propertyKey": "someValueFromAPI",
			"path": "$.someValueFromAPI",
			"validatorName": "Required",
			"validatorFnContext": {"args": {}, "customContext": {}}
		}
	}
}
// please note: there are no errors for optionalProperty since it is not required/optional
```


Various constraints are found in the [src/decorators/constraints](src/app/decorators/constraints) folder.
Constraint names (for e.g. building error messages) are defined in [src/decorators/ValidatorNames.ts](src/app/validator/ValidatorNames.ts).

To see how you might implement your own decorators, see [Advanced Usage](#advanced-usage).





## Nesting

Per default, only the properties of the root class are validated.

Sometimes, it is necessary to validate a deeply nested object structure.

To enable validation of the nested object, use the `@Nested()` decorator.



As with other constraints, `@Nested()` only triggers if the property is not empty (remember: there's `Required()` to enforce a non-empty value).



Example:

```typescript
class NestedClass {
    @Required()
    @MinLength(3)
    value: string;
}

class Root {
    @Nested() // triggers validation of NestedClass if foo is not empty
    foo: NestedClass
}
```





# Validation groups

Sometimes you want to have validations (maybe expensive ones) that should not run on every validation but only when explicitly enabled.



That's where validation groups come into play:

Each constraint is assigned to one ore more validation groups.

If the group is omitted, it's assigned to group `'DEFAULT'`, a.k.a.: `const DEFAULT_GROUP`



Groups can be passed on every decorator in the `opts` parameter:

```
class GroupTesting {
	@Matches(/Apples/, {groups: ['FIRST']})
	@Matches(/Apples|Oranges/, {groups: ['SECOND']})
	@Matches(/Bananas/, {gropus: ['THIRD']})
	value: string;
	
	constructor(value: string) {
		this.value = value;
	}
}

// just a shorthand to make reading of the examples easier:
const validate = (fixture, groups) => new DecoratorValidator().validate(fixture, groups);


await validate(new GroupTesting("Apples"), {groups: ['FIRST']})
// => success (only FIRST executed, passes)
await validate(new GroupTesting("Apples"), {groups: ['SECOND']})
// => success (only SECOND executed, passes)

await validate(new GroupTesting("Oranges"), {groups: ['FIRST']})
// => fail (only FIRST executed, fails)
await validate(new GroupTesting("Oranges"), {groups: ['SECOND']})
// => success (only SECOND executed, passes)

await validate(new GroupTesting("Apples"), {groups: ['FIRST', 'SECOND', 'THIRD']})
// => failure (FIRST and SECOND executed and pass, THIRD executed and fails)

// example of one group stopping validation of followup groups
await validate(new GroupTesting("Oranges"), {groups: ['FIRST', 'SECOND', 'THIRD']})
// => failure (FIRST executed and failed, all others skipped due to failure in FIRST)

// ordering is important!
await validate(new GroupTesting("Oranges"), {groups: ['THIRD', 'SECOND', 'FIRST']})
// => failure (THIRD executed and failed, all others are skipped due to failure in THIRD)

// no groups!
await validate(new GroupTesting("Foobar"), {groups: []})
// => success (nothing executed)
```





Group execution loop explained:

1. Execute all validations in one group.

2. Break if a validation failure occurred anywhere in that group.

3. Otherwise continue with the next group at step 1.



Pseudo-code:

* For every group
  * for each property
    * for each constraint in the current group
      * execute validation
      * break constraint-loop on failure
  * Any error for that group: stop execution and return errors





# Build your own validator

You will hit a point when the existing constraints/decorators will not suffice.

`at-valid` provides two ways to implement your own validations:

* `CustomConstraint()`: great for one-off or prototyping purposes.
* Define your own decorators for repeated use.



## Quick and dirty: CustomConstraint()<a name="CustomConstraintDetails"></a>

`CustomConstraint()` is a predefined decorator where you just have to fill in the validation function and the message, great for one-off or prototyping purposes.

*Don't forget: in most cases you should follow our best practices and not fail on empty values.*

Example:

```typescript
import {isEmpty} from 'at-valid/util/isEmpty';

class ClassUsingCustomConstraint {
    @CustomConstraint(
        'MyValidator',
        (theValue, ctx, theInstance) => isEmpty(theValue) || theValue === 'Wanted: Dead or Alive',
        {hello: 'world'}
    )
    value?: string;
}

const fixture = new ClassUsingCustomConstraint();
fixture.value = 'hiding in the darkness';

const errors = await new DecoratorValidator().validate(fixture);

if (errors) {
    console.log(errors);
}

/* prints:
{
    success: false,
    propertyErrors: {
        value: {
            propertyKey: 'value',
            value: 'hiding in the darkness',
            path: '$.value',
            validatorName: 'MyValidator',
            validatorFnContext: {
                args: {hello: 'world'},
                customContext: {}
            }
        }
    }
}
*/
```



## Reusable: CustomConstraint()

Instead of using [CustomConstraint()](#CustomConstraintDetails) directly in your object, you could wrap it in your own decorator:

```typescript
export function MyConstraint(someParam: string, opt?: Opts) {
    return CustomConstraint('MyConstraint', () => validate(someParam), {arg1: 'yeah'});
}

// then use it as usual: 
class TestClass {
    @MyConstraint('Thanks for all the fish!')
    value?: string;
}
```



## Reusable: write your own decorator

All shipped constraints are implemented using this method. So if you're in doubt, just have a quick glance at the [source of our decorators](src/app/decorators/constraints) that is closest to your requirements.

*Don't forget: in most cases you should follow our best practices and not fail on empty values.*

Konfuzius once said: one line of code tells more than 1000 pictures. So let's have a look at one for reference:

```typescript
import {isEmpty} from 'at-valid/util/isEmpty';

function FavoriteMovieCharacter(movie: string, opts?: Opts) {
    const movies: { [movie: string]: string } = {
        'Blade Runner': 'Deckard',
        'Dune': 'Chani'
    };

    function isValid(value: any): boolean {
        return isEmpty(value) || movies[movie] === value;
    }

    return (target: object, propertyKey: string) => {
        ValidationContext.instance.registerPropertyValidator({
            // make sure the name does not clash with other validators (see below)
            name: 'FavoriteMovieCharacter',
            messageArgs: {movie},
            target,
            propertyKey,
            validatorFn: value => isValid(value),
            opts
        });
    };
}

// and then use as you would use any other constraint:
class FavoriteMovieCharacter {
    @IsIn('Blade Runner')
    movieCast?: string;
}
```

For an up-to-date list of predefined validators, see [ValidatorNames.ts](src/app/validator/ValidatorNames.ts).



## CustomContext

This user-settable parameter available on all decorators is passed to the validation function and eventually to the resulting error object.

For predefined decorators, this enables some way of passing additional arguments to your error message builders.

For your own decorators, this is kinda redundant to decorator parameters.



Example:

```typescript
class CustomContextTester {
    @Required({customContext: {additionalInfo: 'we reeeeeeeally need this value!'}})
    value?: string;

    constructor(value?: string) {
        this.value = value;
    }
}

const fixture = new CustomContextTester();

const error = await new DecoratorValidator().validate(fixture);

if (error.isError && error.propertyErrors.value) {
  console.log(error.propertyErrors.value.validatorFnContext.customContext.additionalInfo);
}

/* prints:
we reeeeeeeally need this value!
*/
```



## Customize messageArgs in the result





## Licensing

The code in this project is licensed under MIT license, see [LICENSE.md](LICENSE.md).
