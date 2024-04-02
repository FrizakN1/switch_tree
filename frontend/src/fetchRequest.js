import API_DOMAIN from "./config";

const FetchRequest = async (url, options) => {
    try {
        const response = await fetch(API_DOMAIN.HTTP+url, options)

        const data = await response.json();

        return { success: true, data };
    } catch (error) {
        console.log(error)
        return { success: false, error };
    }
}

export default FetchRequest