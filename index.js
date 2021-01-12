/* tslint:disable */
import clone from "lodash/clone";
import isObject from "lodash/isObject";
import defaults from "lodash/defaults";
import isNumber from "lodash/isNumber";
import isString from "lodash/isString";
import isBoolean from "lodash/isBoolean";
import cloneDeep from "lodash/cloneDeep";

const dataTypeName = {
  string: "string",
  object: "object",
  number: "number",
  boolean: "boolean",
  array: "array",
  enum: "enum",
  auto: "auto",
};

const dataTypeConstructor = {
  number: (value) => Number(value),
  string: (value) => `${value}`,
  object: (value) => Object(value),
  boolean: (value) => Boolean(value),
};

Object.freeze(dataTypeName);
Object.freeze(dataTypeConstructor);

export default class dataInitializer {
  constructor(data, type = dataTypeName.string, generic, name, debug) {
    this.generic = () => (generic !== undefined ? generic : cloneDeep(data));
    this.newData = this.data = cloneDeep(data);
    this.type = dataTypeName[type]
      ? String(type).toLowerCase()
      : dataTypeName.auto;
    this.debug = debug === true;
    this.name = name;

    this.validator = () => {
      return this.generic();
    };

    if (this.type === dataTypeName.auto) {
      if (isObject(this.newData)) {
        this.type = dataTypeName.object;
      }

      if (isNumber(this.newData)) {
        this.type = dataTypeName.number;
      }

      if (Array.isArray(this.newData)) {
        this.type = dataTypeName.array;
      }

      if (isString(this.newData)) {
        this.type = dataTypeName.string;
      }
    }

    switch (this.type) {
      case dataTypeName.boolean:
        this.validator = this.validateBoolean.bind(this);
        break;

      case dataTypeName.number:
        this.validator = this.validateNumber.bind(this);
        break;

      case dataTypeName.array:
        this.validator = this.validateArray.bind(this);
        break;

      case dataTypeName.object:
        this.validator = this.validateObject.bind(this);
        break;

      case dataTypeName.enum:
        this.validator = this.validateEnum.bind(this);
        break;

      default:
        this.validator = this.validateString.bind(this);
    }

    if (this.debug === true) {
      console.log(name, this.newData, this.type);
    }
  }

  validateEnum() {
    let response = null;

    try {
      if (!isObject(this.generic())) {
        this.generic = () => {};
      }

      if (
        !Array.isArray(this.generic()["options"]) ||
        typeof this.generic()["default"] === "undefined"
      ) {
        throw new Error(`Invalid Generic`);
      }

      if (!isString(this.data) && !isNumber(this.data)) {
        throw new Error(`Invalid Type`);
      }

      let foundOption = this.generic().options.indexOf(this.data);

      if (foundOption < 0) {
        response = this.generic().options[this.generic().default];
      } else {
        response = this.generic().options[foundOption];
      }
    } catch (err) {
      console.error(err, this.data, this.type, this.generic());
      response = this.data;

      if (
        Array.isArray(this.generic()["options"]) &&
        isNumber(this.generic()["default"])
      ) {
        response = this.generic().options[this.generic().default];
      }
    }

    return response;
  }

  validateNumber() {
    let response = null;

    try {
      if (!isNumber(this.generic())) {
        this.generic = () => 0;
      }

      if (isString(this.data)) {
        response = JSON.parse(this.data);
      }

      if (!isNumber(response)) {
        throw "Invalid Type";
      }
    } catch (err) {
      response = this.validateException(err);
    }

    return response;
  }

  validateString() {
    let response = null;

    try {
      if (!isString(this.generic())) {
        this.generic = () => "";
      }

      response = this.data.toString();

      if (!isString(response)) {
        throw "Invalid Type";
      }
    } catch (err) {
      response = this.validateException(err);
    }

    return response;
  }

  validateBoolean() {
    let response = this.data;

    try {
      if (!isBoolean(this.generic())) {
        this.generic = () => false;
      }

      if (isString(this.data)) {
        response = JSON.parse(this.data.toLowerCase());
      }

      if (!isBoolean(response)) {
        throw "Invalid Type";
      }
    } catch (err) {
      response = this.validateException(err);
    }

    return response;
  }

  validateObject() {
    let response = null;

    try {
      let data = this.data;

      if (!isObject(this.generic())) {
        this.generic = () => new Object();
      }

      if (isString(this.data)) {
        data = JSON.parse(data);
      }

      if (!isObject(data)) {
        throw "Invalid Type";
      }

      if (Object.keys(this.generic()).length > 0) {
        data = defaults(this.data, this.generic());
      }

      response = data;
    } catch (err) {
      response = this.validateException(err);
    }

    return response;
  }

  validateArray() {
    let response = null;

    try {
      let data = this.data;

      if (!isObject(this.generic())) {
        this.generic = () => new Object();
      }

      if (isString(this.data)) {
        data = JSON.parse(data);
      }

      if (!Array.isArray(data)) {
        throw "Invalid Type";
      }

      for (let key in data) {
        data[key] = cloneDeep(
          new this.constructor(
            data[key],
            dataTypeName.auto,
            this.generic(),
            this.name + " child"
          ).validator()
        );
      }

      response = data;
    } catch (err) {
      response = this.validateException(err);
    }

    return response;
  }

  validateException(err) {
    if (this.debug) {
      console.log(this.data, this.type, this.generic());
    }

    console.error(err, this.data, this.type);
    return this.generic();
  }
}

export { dataTypeName };
