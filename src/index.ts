import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, int, float32, int8, int16 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Shoe = Record<{
    id: string;
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
    rating: float32;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type ShoePayload = Record<{
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
}>

const shoeStorage = new StableBTreeMap<string, Shoe>(0, 44, 1024)

$update;
export function createShoe(payload: ShoePayload): Result<Shoe, string> {
    // Input validation for price and quantity
    if (payload.price <= 0) {
        return Result.Err<Shoe, string>('Price must be greater than 0');
    }
    if (payload.quantity.trim() === '') {
        return Result.Err<Shoe, string>('Quantity cannot be empty');
    }

    const shoe: Shoe = { id: uuidv4(), createdAt: ic.time(), rating: 1.0, updatedAt: Opt.None, ...payload };
    shoeStorage.insert(shoe.id, shoe);
    return Result.Ok(shoe);
}

// gets all the shoes in the store
$query
export function getShoe(): Vec<Shoe> {
    return shoeStorage.values();
}

// gets a particular shoe using the shoe's id
$query
export function getShoeById(id: string): Result<Shoe, string> {
    return match(shoeStorage.get(id), {
        Some: (shoe) => Result.Ok<Shoe, string>(shoe),
        None: () => Result.Err<Shoe, string>(`A shoe with id=${id} not found`),
    });
}

// function that searches for a shoe product
$query
export function searchShoeProduct(keyword: string): Result<Vec<Shoe>, string> {
    if (!keyword || keyword.trim() === '') {
        return Result.Err<Vec<Shoe>, string>('Keyword cannot be empty');
    }
    const result = shoeStorage.values().filter((shoe) => shoe.name.includes(keyword));
    return Result.Ok<Vec<Shoe>, string>(result);
}

// Function for rating a shoe
$update
export function rateShoe(id: string, rate: number): Result<Shoe, string> {
    // Make sure the rating range is not less than 0 or greater than 4
    if (rate < 0 || rate > 4) {
        return Result.Err<Shoe, string>('Error rating shoe. Invalid rating value. Value should not be more than 4 or less than 0');
    }

    // Gets the shoe details by its id
    const shoe = match(shoeStorage.get(id), {
        Some: (shoe) => shoe,
        None: () => return Result.Err<Shoe, string>(`Error rating shoe with id=${id}. Shoe not found`),
    });

    // Calculates the new rating by adding the current rating to the user's
    // rating and dividing the result by 4
    const newRating: float32 = (shoe.rating + rate) / 4;

    const updatedShoe: Shoe = {
        ...shoe,
        rating: newRating,
    };

    shoeStorage.insert(updatedShoe.id, updatedShoe);
    return Result.Ok<Shoe, string>(updatedShoe);
}

// Delete a specific shoe using the shoe id
$update
export function deleteShoe(id: string): Result<Shoe, string> {
    const shoe = match(shoeStorage.remove(id), {
        Some: (deletedShoe) => deletedShoe,
        None: () => return Result.Err<Shoe, string>(`Couldn't delete shoe with id=${id}. Shoe not found.`),
    });
    return Result.Ok<Shoe, string>(shoe);
}

// Update the details of a shoe in the store
$update
export function updateShoe(id: string, payload: ShoePayload): Result<Shoe, string> {
    // Check if the shoe exists
    const shoe = match(shoeStorage.get(id), {
        Some: (shoe) => shoe,
        None: () => return Result.Err<Shoe, string>(`Couldn't update shoe with id=${id}. Shoe not found`),
    });

    // Input validation for price and quantity
    if (payload.price <= 0) {
        return Result.Err<Shoe, string>('Price must be greater than 0');
    }
    if (payload.quantity.trim() === '') {
        return Result.Err<Shoe, string>('Quantity cannot be empty');
    }

    const updatedShoe: Shoe = {
        ...shoe,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
    };
    shoeStorage.insert(updatedShoe.id, updatedShoe);
    return Result.Ok<Shoe, string>(updatedShoe);
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    },
};
