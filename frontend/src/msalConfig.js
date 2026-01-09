import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser'

// Microsoft Azure AD App Registration Config
const msalConfig = {
    auth: {
        clientId: 'c38742dd-1cd5-4b90-a15b-90b2bc589644',
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: 'http://localhost:5173',
        postLogoutRedirectUri: 'http://localhost:5173',
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true,
    },
    system: {
        allowNativeBroker: false,
        windowHashTimeout: 60000,
        iframeHashTimeout: 10000,
        loadFrameTimeout: 0,
        asyncPopups: false
    }
}

// Scopes needed for calendar and tasks access
export const loginRequest = {
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Tasks.ReadWrite'],
}

export const graphConfig = {
    graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
    graphCalendarEndpoint: 'https://graph.microsoft.com/v1.0/me/calendar/events',
    graphBatchEndpoint: 'https://graph.microsoft.com/v1.0/$batch',
    graphTodoListsEndpoint: 'https://graph.microsoft.com/v1.0/me/todo/lists',
}

export const msalInstance = new PublicClientApplication(msalConfig)

// Track initialization state
let msalInitialized = false
let initPromise = null

// Initialize MSAL - must be called before any other MSAL operations
export const initializeMsal = async () => {
    if (msalInitialized) {
        const accounts = msalInstance.getAllAccounts()
        return accounts.length > 0 ? accounts[0] : null
    }

    if (initPromise) {
        return initPromise
    }

    initPromise = (async () => {
        try {
            await msalInstance.initialize()
            msalInitialized = true

            // Handle redirect response (if coming back from redirect)
            try {
                const response = await msalInstance.handleRedirectPromise()
                if (response) {
                    return response.account
                }
            } catch (error) {
                console.warn('Error handling redirect:', error)
            }

            // Check if user is already signed in
            const accounts = msalInstance.getAllAccounts()
            if (accounts.length > 0) {
                return accounts[0]
            }

            return null
        } catch (error) {
            console.error('MSAL initialization error:', error)
            msalInitialized = true // Mark as initialized to prevent retry loops
            return null
        }
    })()

    return initPromise
}

// Ensure MSAL is initialized before operations
const ensureInitialized = async () => {
    if (!msalInitialized) {
        await initializeMsal()
    }
}

// Get access token
export const getAccessToken = async () => {
    await ensureInitialized()

    const accounts = msalInstance.getAllAccounts()

    if (accounts.length === 0) {
        throw new Error('No accounts found. Please sign in first.')
    }

    try {
        const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
        })
        return response.accessToken
    } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
            // Use redirect for token acquisition to avoid popup issues
            const response = await msalInstance.acquireTokenPopup({
                ...loginRequest,
                account: accounts[0],
            })
            return response.accessToken
        }
        throw error
    }
}

// Sign in with popup
export const signInWithMicrosoft = async () => {
    await ensureInitialized()

    try {
        // Clear any stale interaction state
        const accounts = msalInstance.getAllAccounts()
        if (accounts.length > 0) {
            return accounts[0]
        }

        const response = await msalInstance.loginPopup({
            ...loginRequest,
            prompt: 'select_account'
        })
        return response.account
    } catch (error) {
        console.error('Login failed:', error)

        // If popup fails, try redirect as fallback
        if (error.errorCode === 'popup_window_error' || error.errorCode === 'hash_empty_error') {
            console.log('Popup failed, trying redirect...')
            await msalInstance.loginRedirect(loginRequest)
            return null
        }

        throw error
    }
}

// Sign out
export const signOutFromMicrosoft = async () => {
    await ensureInitialized()

    const accounts = msalInstance.getAllAccounts()
    if (accounts.length > 0) {
        try {
            await msalInstance.logoutPopup({
                account: accounts[0],
                postLogoutRedirectUri: window.location.origin
            })
        } catch (error) {
            // Clear local state if popup fails
            console.warn('Logout popup failed, clearing local state')
        }
    }
}
