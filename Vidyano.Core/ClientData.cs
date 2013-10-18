using System.Collections.ObjectModel;
using System.Linq;
using Newtonsoft.Json.Linq;
using Vidyano.Common;

namespace Vidyano
{
    public sealed class ClientData
    {
        internal ClientData(JObject clientData)
        {
            DefaultUserName = (string)clientData["defaultUser"];

            var languages = (JObject)clientData["languages"];
            Languages = languages.Properties().Select(l =>
                new ServiceLanguage(l.Name,
                    (string)l.Value["name"],
                    (bool?)l.Value["isDefault"] ?? false,
                    new KeyValueList<string, string>(new ReadOnlyDictionary<string, string>(((JObject)l.Value["messages"]).Properties().ToDictionary(m => m.Name, m => (string)m)), true))).ToArray();

            var providers = (JObject)clientData["providers"];
            OAuthServiceProviders = providers.Properties().Select(p => new ServiceProvider(p.Name, ((JObject)p.Value["parameters"]).Properties().ToDictionary(m => m.Name, m => (string)m))).ToArray();
            VidyanoServiceProvider = OAuthServiceProviders.FirstOrDefault(p => p.Name == "Vidyano");
            if (VidyanoServiceProvider != null)
                OAuthServiceProviders = OAuthServiceProviders.Where(p => p != VidyanoServiceProvider).ToArray();
        }

        public ServiceLanguage[] Languages { get; private set; }

        public ServiceProvider VidyanoServiceProvider { get; private set; }

        public ServiceProvider[] OAuthServiceProviders { get; private set; }

        public string DefaultUserName { get; private set; }

        public bool HasMixedServiceProviders
        {
            get { return HasOAuthProviders && HasVidyanoProvider; }
        }

        public bool HasVidyanoProvider
        {
            get { return VidyanoServiceProvider != null; }
        }

        public bool HasOAuthProviders
        {
            get { return OAuthServiceProviders.Length > 0; }
        }
    }
}