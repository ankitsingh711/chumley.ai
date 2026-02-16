import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    loginUser,
    registerUser,
    logoutUser,
    clearError
} from '../store/slices/authSlice';

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, error } = useAppSelector(
        (state) => state.auth
    );

    const login = useCallback(
        async (email: string, password: string) => {
            const resultAction = await dispatch(loginUser({ email, password }));
            if (loginUser.fulfilled.match(resultAction)) {
                return;
            } else {
                throw new Error(resultAction.payload as string || 'Login failed');
            }
        },
        [dispatch]
    );

    const register = useCallback(
        async (email: string, password: string, name: string) => {
            const resultAction = await dispatch(registerUser({ email, password, name }));
            if (registerUser.fulfilled.match(resultAction)) {
                return;
            } else {
                throw new Error(resultAction.payload as string || 'Registration failed');
            }
        },
        [dispatch]
    );

    const logout = useCallback(() => {
        dispatch(logoutUser());
    }, [dispatch]);

    const clearAuthError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearAuthError
    };
};
