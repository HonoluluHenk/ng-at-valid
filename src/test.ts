import 'jest-preset-angular';

Object.defineProperty(window, 'CSS', {value: null});
Object.defineProperty(window, 'getComputedStyle', {
    value: () => {
        return {
            display: 'none',
            appearance: ['-webkit-appearance']
        };
    }
});

Object.defineProperty(document, 'doctype', {
    value: '<!DOCTYPE html>'
});
// noinspection XHTMLIncompatabilitiesJS
Object.defineProperty(document.body.style, 'transform', {
    value: () => {
        return {
            enumerable: true,
            configurable: true
        };
    }
});
