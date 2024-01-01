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

export class MissingRequirementsError extends Error {

    requirements: Requirement[];

    constructor(requirements: Requirement[]) {
        super();
        this.requirements = requirements;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, MissingRequirementsError.prototype);
    }   
}

export interface Requirement {
    name: string,
    success: boolean
}