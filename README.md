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
    public readonly form: FormGroup;

    constructor(angularFb: FormBuilder) {
        this.form = new AtValidFormBuilder(angularFb).groupFrom(MyClass);
        // validation groups are supported:
        this.form = new AtValidFormBuilder(angularFb).groupFrom(MyClass, {group: 'FAST_VALIDATIONS'});

 
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

* [at-valid](https://www.npmjs.com/package/at-valid)

### Installation

NPM:

```shell
npm install --save ng-at-valid
```

Yarn:

```shell
yarn add ng-at-valid
```


## Nesting

As of now, automatic nesting of form groups is not yet supported.

## Licensing

The code in this project is licensed under MIT license, see [LICENSE.md](LICENSE.md).
