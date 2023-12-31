export class SignatureError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, SignatureError.prototype);
    }
}
export class UserUnknownError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, UserUnknownError.prototype);
    }   
}

export class MissingRequirementError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, MissingRequirementError.prototype);
    }   
}