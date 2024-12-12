class Accounts_API {
    static API_URL() { return "https://accessible-malleable-bovid.glitch.me/api/accounts"; }
    static CONTROLLER_URL() { return "https://accessible-malleable-bovid.glitch.me/accounts"; }
    static LIKES_URL() { return "https://accessible-malleable-bovid.glitch.me/likes"; }

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }

    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText === 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }

    static async HEAD() {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    static async Get(id = null) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + (id != null ? "/" + id : ""),
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    static async GetQuery(queryString = "") {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + queryString,
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }

    static async Save(data, create = true) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.API_URL() : this.API_URL() + "/" + data.Email,
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    static async Delete(email) {
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + "/" + email,
                type: "DELETE",
                complete: () => {
                    Accounts_API.initHttpState();
                    resolve(true);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }

    static async Login(credentials) {
        Accounts_API.initHttpState(); 
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + "/token",
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(credentials),
                success: (data) => { 
                    resolve(data); 
                },
                error: (xhr) => { 
                    Accounts_API.setHttpErrorState(xhr); 
                    resolve(null); 
                }
            });
        });
    }
    static async Logout(userId) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.CONTROLLER_URL() + `/logout/?userId=${userId}`,
                type: "GET",
                success: () => {
                    if (xhr.status === 202) {
                        resolve(true); 
                    } else {
                        resolve(false); 
                    }
                },
                error: (xhr) => {
                    if (xhr.status === 202) {
                        resolve(true);
                    }else{
                        Accounts_API.setHttpErrorState(xhr);
                        resolve(false); 
                    }
                    
                }
            });
        });
    }    
    static async Conflict(id, email) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.CONTROLLER_URL()}/conflict?Id=${encodeURIComponent(id)}&Email=${encodeURIComponent(email)}`,
                type: "GET",
                success: (data) => {
                    resolve(data); 
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null); 
                }
            });
        });
    }
    static async Register(data) {
        console.log(data);
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.CONTROLLER_URL() + "/register",
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Remove(userIdToRemove, currentUserId) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.CONTROLLER_URL() + `/remove?userIdToRemove=${userIdToRemove}&currentUserId=${currentUserId}&`,
                type: "GET",
                contentType: 'application/json',
                success: (data) => { resolve(data); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Modify(user) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.CONTROLLER_URL() + "/modify", 
                type: "PUT",
                contentType: 'application/json',
                data: JSON.stringify(user),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr); 
                    resolve(null);
                }
            });
        });
    }
    static async Verify(id, code) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.CONTROLLER_URL()}/verify?id=${id}&code=${code}`,
                type: "GET",
                success: (data) => {
                    resolve(data); 
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr); 
                    resolve(null);
                }
            });
        });
    }
    static async AddLike(userId, postId) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.LIKES_URL()}/add`, 
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ userId, postId }),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
    
    static async RemoveLike(userId, postId) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.LIKES_URL()}/remove`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ userId, postId }),
                success: (data) => {
                    console.log('Response data:', data);
                    resolve(data);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    console.error('Error response:', xhr);
                    resolve(null);
                }
            });
        });
    }
    static async GetLikesCount(postId) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.LIKES_URL()}/count?postId=${postId}`,
                type: 'GET',
                contentType: 'application/json',
                success: (data) => {
                    resolve(data.likesCount); 
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null); 
                }
            });
        });
    }
    static async HasUserLikedPost(postId, userId) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.LIKES_URL()}/liked?userId=${userId}&postId=${postId}`,
                type: 'GET',
                contentType: 'application/json',
                success: (data) => {
                    resolve(data.liked); 
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null); 
                }
            });
        });
    }
    static async Promote(user) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.CONTROLLER_URL()}/promote`,
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(user),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
    static async block(user) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.CONTROLLER_URL()}/block`,
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(user),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
}
