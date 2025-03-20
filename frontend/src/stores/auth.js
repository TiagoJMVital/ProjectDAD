import { ref, computed, inject } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { useErrorStore } from '@/stores/error'
import { useRouter } from 'vue-router'
import avatarNoneAssetURL from '@/assets/avatar-none.png'
import { useToast } from '@/components/ui/toast/use-toast'

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()
    const storeError = useErrorStore()
    const user = ref(null)
    const token = ref('')
    const lastPage = ref([]);
    const users = ref([]);
    const { toast } = useToast()
    const socket = inject('socket')

    const userId = computed(() => {
        return user.value ? user.value.id : 0
    })

    const userName = computed(() => {
        return user.value ? user.value.name : ''
    })
    const userFirstLastName = computed(() => {
        const names = userName.value.trim().split(' ')
        const firstName = names[0] ?? ''
        const lastName = names.length > 1 ? names[names.length - 1] : ''
        return (firstName + ' ' + lastName).trim()
    })
    const getFirstLastName = (fullName) => {
        const names = fullName.trim().split(' ')
        const firstName = names[0] ?? ''
        const lastName = names.length > 1 ? names[names.length -1 ] : ''
        return (firstName + ' ' + lastName).trim()
    }
    const userEmail = computed(() => {
        return user.value ? user.value.email : ''
    })
    const userNickname = computed(() => {
        return user.value ? user.value.nickname : ''
    })
    const userType = computed(() => {
        return user.value ? user.value.type : ''
    })


    function replaceLast(text, searchValue, replaceValue) {
        const lastOccurrenceIndex = text.lastIndexOf(searchValue)
        return `${
            text.slice(0, lastOccurrenceIndex)
          }${
            replaceValue
          }${
            text.slice(lastOccurrenceIndex + searchValue.length)
          }`
      }


      const userPhotoUrl = computed(() => {        
        const photoFile = user.value ? user.value.photoFileName ?? '' : ''
        if (photoFile) {
            return replaceLast(axios.defaults.baseURL, '/api', photoFile)
        }
        return avatarNoneAssetURL
    })

    const userCurrentBalance = computed(() => {
        return user.value ? user.value.brain_coins_balance : ''
    })

    const userCurrentBlock = computed(() => {
        return user.value ? user.value.blocked : ''
    })

    const getUserById = (userId) => {
        return user.value ? user.value.id === userId : false
    }

    // This function is "private" - not exported by the store
    const clearUser = () => {
        resetIntervalToRefreshToken()
        if (user.value) {
            socket.emit('logout', user.value) 
        }
        user.value = null
        user.value = ''
        localStorage.removeItem('token')
        axios.defaults.headers.common.Authorization = ''
    }

    const login = async (credentials) => {
        storeError.resetMessages()
        try {
            const responseLogin = await axios.post('auth/login', credentials)
            token.value = responseLogin.data.token
            localStorage.setItem('token', token.value)
            axios.defaults.headers.common.Authorization = 'Bearer ' + token.value
            const responseUser = await axios.get('users/me')
            user.value = responseUser.data.data
            socket.emit('login', user.value) 
            repeatRefreshToken()
            if(user.value.type == 'A'){
                router.push({ name: 'dashboard' })
            }else{
                router.push({ name: 'index' })
            }
            return user.value
        } catch (e) {
            clearUser()
            storeError.setErrorMessages(e.response.data.message, e.response.data.errors,
                e.response.status, 'Authentication Error!')
            return false
        }
    }


    const register = async (credentials) => {
        storeError.resetMessages()
        try {
            
            const responseRegister = await axios.post('auth/register', credentials)
            token.value = responseRegister.data.token
            localStorage.setItem('token', token.value)
            axios.defaults.headers.common.Authorization = 'Bearer ' + token.value
            const responseUser = await axios.get('users/me')
            user.value = responseUser.data.data
            repeatRefreshToken()
            if(user.value.type == 'A'){
                router.push({ name: 'dashboard' })
            }else{
                router.push({ name: 'index' })
            }
            return user.value
        } catch (e) {
            clearUser()
            storeError.setErrorMessages(e.response.data.message, e.response.data.errors,
                e.response.status, 'Authentication Error!')
            return false
        }
    }

    const logout = async () => {
        storeError.resetMessages()
        try {
            await axios.post('auth/logout')
            clearUser()
            router.push({ name: 'login' })
            return true
        } catch (e) {
            clearUser()
            storeError.setErrorMessages(e.response.data.message, [], e.response.status,
                'Authentication Error!')
            return false
        }
    }

    let intervalToRefreshToken = null
    
    const resetIntervalToRefreshToken = () => {
        if (intervalToRefreshToken) {
            clearInterval(intervalToRefreshToken)
        }
        intervalToRefreshToken = null
    }
    const repeatRefreshToken = () => {
        if (intervalToRefreshToken) {
            clearInterval(intervalToRefreshToken)
        }
        intervalToRefreshToken = setInterval(async () => {
            try {
                const response = await axios.post('auth/refreshtoken')
                localStorage.setItem('token', token.value)
                token.value = response.data.token
                axios.defaults.headers.common.Authorization = 'Bearer ' + token.value
                return true
            } catch (e) {
                clearUser()
                storeError.setErrorMessages(e.response.data.message,
                    e.response.data.errors, e.response.status, 'Authentication Error!')
                return false
            }
        }, 1000 * 60 * 110) // repeat every 110 minutes
        // To test the refresh token, replace previous line with the following code
        // This will repeat the refreshtoken endpoint every 10 seconds:
        //}, 1000 * 10)
        return intervalToRefreshToken
    }

    const restoreToken = async function () {
        let storedToken = localStorage.getItem('token')
        if (storedToken) {
        try {
            token.value = storedToken
            axios.defaults.headers.common.Authorization = 'Bearer ' + token.value
            const responseUser = await axios.get('users/me')
            user.value = responseUser.data.data
            socket.emit('login', user.value) 
            repeatRefreshToken()
            return true
        } catch {
            clearUser()
            return false
        }
        }
            return false
    }


    const refreshUser = async () => {
        try {
            const responseUser = await axios.get('users/me');
            user.value = responseUser.data.data; // Atualiza todos os dados do usuário, incluindo o saldo
        } catch (error) {
            console.error('Erro ao atualizar os dados do usuário:', error);
        }
    };

    //atualizar o saldo do utilizador
    const updateBalance = async (newBalance) => {
        let currentBalance = userCurrentBalance.value
        let newBalanceUser = currentBalance + newBalance
        user.value.brain_coins_balance = newBalanceUser
        const response = await axios.put('users/me/brain_coins_balance', { brain_coins_balance: newBalanceUser })
        return response.data.data
    }

    //listar todos os users

    const fetchUsers = async (page) => {
        storeError.resetMessages();
        const response = await axios.get(`users?page=${page}`);
        users.value = response.data.data;
        lastPage.value = response.data.meta.last_page;
        return response.data.data;
        
    }

    const deleteUser = async (userId) => {
        storeError.resetMessages();
        try {
            const response = await axios.delete(`users/${userId}`);
            const index = users.value.findIndex(user => user.id === userId);
            if(index > -1){
                users.value.splice(index, 1);
            }
            return response.data.data;
        } catch (error) {
            storeError.setErrorMessages('Failed to delete user:', error);
            console.log(error);
            return false;
        }
    }

    //funcao dar update do block
    const updateBlock = async (userId) => {
        try {
            // Localiza o índice do usuário na lista
            const userIndex = users.value.findIndex((u) => u.id === userId);
            if (userIndex === -1) {
                throw new Error("Usuário não encontrado na lista.");
            }
    
            // Obtém o status atual do usuário
            const currentBlockStatus = users.value[userIndex].blocked;
    
            // Faz a chamada para atualizar no backend
            const response = await axios.put(`users/${userId}/blocked`, {
                blocked: !currentBlockStatus,
            });
    
            // Atualiza o estado do usuário na lista
            users.value[userIndex] = response.data.data;
    
            return response.data.data;
        } catch (error) {
            console.error("Erro ao atualizar o status de bloqueio do usuário:", error);
            throw error;
        }
    };
    

    const updateProfile = async (userData) => {
        storeError.resetMessages()
        try {
            const responseUpdate = await axios.put('user/'+user.value.id, userData)
            user.value = responseUpdate.data.data;
            
            toast({
                description: 'Your profile has been correctly updated!',
            })
            return true
        } catch (error) {
            if (error.response) {
                //Erro da API
                if (error.response.status === 422) {
                    storeError.setErrorMessages(
                        error.response.data.message,
                        error.response.data.errors,
                        error.response.status,
                        'There was an error validating your input.'
                    );
                } else {
                    toast({
                        description: error.response.data.message || 'An error occurred while updating your inputs.',
                        variant: 'destructive',
                    });
                }
                
            } else {
                //Erro inesperado
                toast({
                    description: 'A network error occurred. Please try again later.',
                    variant: 'destructive',
                });
            }
    
            return false;
        }
    }

    const updatePassword = async (passwords) => {
        storeError.resetMessages()
        try {
            const responseUpdate = await axios.put('user/password/'+user.value.id, passwords)
            
            toast({
                description: 'Your password has been correctly updated!',
            })

            return true
        } catch (error) {
            if (error.response) {
                //Erro da API
                if (error.response.status === 400 && error.response.data.error === 'The current password is incorrect.') {
                    toast({
                        description: 'The current password is incorrect. Try again',
                        variant: 'destructive',
                    });
                } else if (error.response.status === 422) {
                    storeError.setErrorMessages(
                        error.response.data.message,
                        error.response.data.errors,
                        error.response.status,
                        'There was an error validating your input.'
                    );
                } else {
                    toast({
                        description: error.response.data.message || 'An error occurred while updating the password.',
                        variant: 'destructive',
                    });
                }
                
            } else {
                //Erro inesperado
                toast({
                    description: 'A network error occurred. Please try again later.',
                    variant: 'destructive',
                });
            }
    
            return false;
        }
    }

    const deleteLoggedUser = async () => {
        try {
            const responseDelete = await axios.delete('users/'+user.value.id)
            
            clearUser()
            router.push({ name: 'login' })

            toast({
                description: 'Your account has been correctly deleted.',
            })

            return true
        } catch (e) {
            clearUser()
            storeError.setErrorMessages(e.response.data.message, e.response.data.errors, e.response.status, 'Something went wrong!')
            return false
        }
    }


    return {
        user, userName, userEmail, userType, userPhotoUrl, userFirstLastName, userCurrentBalance, users, lastPage, userCurrentBlock, userNickname, userId, getFirstLastName,
        getUserById,login, logout, restoreToken, register, updateBalance, fetchUsers, deleteUser, updateBlock, updateProfile, updatePassword, deleteLoggedUser,refreshUser

    }
})