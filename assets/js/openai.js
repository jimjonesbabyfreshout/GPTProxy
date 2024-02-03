//Refer to https://github.com/open-tdp/openai-chat
const app = {
    u: '',
    alert: null,
    total: null,
    loading: false,
    isValidated() {
        const inputText = this.u.trim();
        // Use regex to match keys starting with "sk-" and filter out non-matches
        const regex =  /^(sk-|sess-).{21,}$/;
        const keys = inputText.split('\n').filter(key => regex.test(key.trim()));
        return keys
    },

    clear() {
        this.total = this.total.filter(item => {
            return item.total_available && (item.total_available > 0 || item.total_available === "Query failed");
        });
        this.u = this.total.map(item => item.key).join('\n');
        this.alert = { type: 'success', message: 'Cleaned up' };
    },

    async submit($refs) {
        if (!this.u) {
            this.alert = { type: 'error', message: 'Please enter Authorization starting with sess-' }
            return
        }
        const keys = this.isValidated();
        if (keys.length === 0) {
            this.alert = { type: 'error', message: 'Invalid key format' }
            return
        }

        keys.forEach(async (key) => {
            await this.checkBilling(key);
        });


    },

    async fetch(path, body, key) {
        key = key || 'this.defaultKey';

        const opts = {
            method: 'GET',
            headers: {
                'content-type': 'application/json',
                Authorization: 'Bearer ' + key,
            },
            credentials: 'omit', // Add this line to stop sending credentials
        }

        if (body != null) {
            opts.method = 'POST';
            opts.body = JSON.stringify(body);
        }

        return fetch(path, opts).then(async r => {

            const data = await r.json();
            if (!r.ok) {
                if (data && data.error) {
                    // console.log(data.error);
                    // throw new Error(data.error.message);
                    return data
                }
                throw new Error(r.statusText || 'Request failed');
            }
            return data;
        })
    },


    async checkBilling(key) {
        this.alert = null
        this.loading = true
        this.total = null
        const today = new Date();
        const formatDate = function (timestamp) {
            const date = new Date(timestamp * 1000);
            return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
        };

        const headers = {
            'content-type': 'application/json',
            'Authorization': `Bearer ${key}`
        }
        const subscription = await this.fetch('/v1/dashboard/billing/subscription', null, key);
        if (!subscription || !subscription.plan) {
            if (!this.total) {
                this.total = [];
            }
            this.total.push({
                key: key,
                msgkey: key.replace(/(sess-.{5}).+(.{5})/, '$1****$2'),
                total_granted: 0,
                total_used: 0,
                total_available: 0,
                plan: 'API Key Invalid',
                endDate: '',
                latest_gpt: subscription.error.code
            });
            this.loading = false
            this.alert = { type: 'success', message: "Query successful" }
        } else {
            const start_date = subscription.hard_limit_usd > 20
                ? [today.getFullYear(), today.getMonth() + 1, '1'].join('-') : formatDate(today / 1000 - 90 * 86400);
            const end_date = formatDate(today / 1000 + 86400);
            const usageData = await this.fetch(`/v1/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`, null, key);

            const modelData = await this.fetch('/v1/models', null, key);


            const gptModels = modelData.data.filter(model => model.id.includes("gpt"));
            const highestGPTModel = gptModels.reduce((prev, current) => {
                const prevVersion = parseFloat(prev.id.split("-")[1]);
                const currentVersion = parseFloat(current.id.split("-")[1]);
                return (currentVersion > prevVersion) ? current : prev;
            });
            const GPTModel = highestGPTModel.id
            const plan = (subscription.plan.title === "Pay-as-you-go") ? "Pay-as-you-go" : subscription.plan.id;
            //Total
            const total_granted = subscription.hard_limit_usd;
            //Used
            // const total_used = usageData.total_usage / 100 || -1
            const total_used = typeof usageData.total_usage === "number" ? usageData.total_usage / 100 : "Query failed";

            // Remaining quota
            const total_available = typeof total_used === "number" ? total_granted - total_used : "Query failed";

            //Remaining quota
            // const total_available = total_granted - total_used;

            if (!this.total) {
                this.total = [];
            }
            this.total.push({
                key: key,
                msgkey: key.replace(/(sess-.{5}).+(.{5})/, '$1****$2'),
                total_granted: total_granted,
                total_used: total_used,
                total_available: total_available,
                plan: plan,
                endDate: formatDate(subscription.access_until),
                latest_gpt: GPTModel,
            });


        }

        this.loading = false
        this.alert = { type: 'success', message: "Query successful" }
        return

    }
}


const ip = {
    ipinfo: '',
    getipinfo() {
        fetch('https://forge.speedtest.cn/api/location/info')
            .then(res => res.json())
            .then(res => {
                // console.log(res);
                this.ipinfo = `Current IP: ${res.ip} (${res.province} ${res.city}  ${res.distinct} ${res.isp})  `

            })
            .catch(err => {
                console.log(err);
            })
    }
}




function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            alert('API copied to clipboard');
        })
        .catch((error) => {
            console.error('Error copying API to clipboard:', error);
        });
}
