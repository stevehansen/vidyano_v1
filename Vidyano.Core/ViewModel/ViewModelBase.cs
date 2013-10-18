using System;
using System.Runtime.CompilerServices;
using Newtonsoft.Json.Linq;
using Vidyano.Common;

namespace Vidyano.ViewModel
{
    public abstract class ViewModelBase : NotifyableBase
    {
        protected ViewModelBase(JObject model)
        {
            Model = model;
        }

        internal string PreviousState
        {
            get { return GetProperty<string>("__CurrentState"); }
            set { SetProperty(value, "__CurrentState"); }
        }

        internal string PagePath { get; set; }

        internal JObject Model { get; private set; }

        /// <summary>
        ///     Checks if a property already matches a desired value.  Sets the property and
        ///     notifies listeners only when necessary.
        /// </summary>
        /// <typeparam name="T">Type of the property.</typeparam>
        /// <param name="value">Desired value for the property.</param>
        /// <param name="propertyName">
        ///     Name of the property used to notify listeners.  This
        ///     value is optional and can be provided automatically when invoked from compilers that
        ///     support CallerMemberName.
        /// </param>
        /// <returns>
        ///     True if the value was changed, false if the existing value matched the
        ///     desired value.
        /// </returns>
        protected bool SetProperty<T>(T value, [CallerMemberName] String propertyName = null)
        {
            var camelCasePropertyName = GetCamelCasePropertyName(propertyName);
            var token = value != null ? JToken.FromObject(value) : null;
            if (Equals(Model[camelCasePropertyName], token)) return false;

            Model[camelCasePropertyName] = token;
            OnPropertyChanged(propertyName);
            return true;
        }

        protected T GetProperty<T>([CallerMemberName] String propertyName = null)
        {
            JToken token;
            if (Model.TryGetValue(GetCamelCasePropertyName(propertyName), out token) && token != null && token.Type != JTokenType.Null)
                return token.ToObject<T>();

            return default(T);
        }

        private static string GetCamelCasePropertyName(string propertyName)
        {
            return char.ToLowerInvariant(propertyName[0]) + propertyName.Substring(1);
        }

        protected virtual string[] GetServiceProperties()
        {
            return new string[0];
        }

        internal virtual JObject ToServiceObject()
        {
            var obj = new JObject();

            foreach (var p in GetServiceProperties())
            {
                JToken token;
                if (Model.TryGetValue(p, out token) && token != null)
                    obj[p] = token;
            }

            return obj;
        }
    }
}