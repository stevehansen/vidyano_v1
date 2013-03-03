using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using System.Reflection;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.Common
{
    public class Events
    {
        public static readonly DependencyProperty BindingsProperty = DependencyProperty.RegisterAttached("Bindings", typeof(EventBindingCollection), typeof(Events), new PropertyMetadata(new EventBindingCollection(), BindingsCollection_Changed));

        public static EventBindingCollection GetBindings(DependencyObject obj)
        {
            return (EventBindingCollection)obj.GetValue(BindingsProperty);
        }

        public static void SetBindings(DependencyObject obj, EventBindingCollection value)
        {
            obj.SetValue(BindingsProperty, value);
        }

        private static void BindingsCollection_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var fe = d as FrameworkElement;
            if (fe != null)
                fe.Loaded += fe_Loaded;
        }

        private static void AddEventHandlers(DependencyObject d)
        {
            var ti = d.GetType().GetTypeInfo();

            foreach (var eventBinding in GetBindings(d))
            {
                var runtimeEvent = d.GetType().GetRuntimeEvent(eventBinding.Event);
                if (runtimeEvent != null)
                {
                    var handlerType = runtimeEvent.EventHandlerType;

                    var addHandler = typeof(Events).GetRuntimeMethod("AddHandler", new[] { typeof(DependencyObject), typeof(EventBinding), typeof(EventInfo) }).MakeGenericMethod(handlerType);
                    addHandler.Invoke(null, new object[] { d, eventBinding, runtimeEvent });
                }
            }
        }

        private static void RemoveEventHandlers(DependencyObject d)
        {
            var ti = d.GetType().GetTypeInfo();

            foreach (var eventBinding in GetBindings(d))
            {
                var runtimeEvent = d.GetType().GetRuntimeEvent(eventBinding.Event);
                if (runtimeEvent != null)
                {
                    var handlerType = runtimeEvent.EventHandlerType;

                    var removeHandler = typeof(Events).GetRuntimeMethod("RemoveHandler", new[] { typeof(DependencyObject), typeof(EventBinding), typeof(EventInfo) }).MakeGenericMethod(handlerType);
                    removeHandler.Invoke(null, new object[] { d, eventBinding, runtimeEvent });
                }
            }
        }

        static void fe_Unloaded(object sender, RoutedEventArgs e)
        {
            var fe = sender as FrameworkElement;
            RemoveEventHandlers(fe);

            fe.Unloaded -= fe_Unloaded;
            fe.Loaded += fe_Loaded;
        }

        static void fe_Loaded(object sender, RoutedEventArgs e)
        {
            var fe = sender as FrameworkElement;
            AddEventHandlers(fe);

            fe.Unloaded += fe_Unloaded;
            fe.Loaded -= fe_Loaded;
        }

        public static void AddHandler<T>(DependencyObject d, EventBinding eventBinding, EventInfo runtimeEvent)
        {
            if (eventBinding.handler == null)
            {
                var invokeMethod = typeof(T).GetRuntimeMethods().First(mi => mi.Name == "Invoke");
                var argType = invokeMethod.GetParameters()[1].ParameterType;
                var targetMethod = eventBinding.GetType().GetRuntimeMethods().First(mi => mi.Name == "Invoked").MakeGenericMethod(argType);

                Func<T, EventRegistrationToken> addMethod = (a) => { return (EventRegistrationToken)runtimeEvent.AddMethod.Invoke(d, new object[] { a }); };
                Action<EventRegistrationToken> removeMethod = (a) => { runtimeEvent.RemoveMethod.Invoke(d, new object[] { a }); };

                eventBinding.handler = targetMethod.CreateDelegate(typeof(T), eventBinding);
                eventBinding.addMethod = addMethod;
                eventBinding.removeMethod = removeMethod;
            }

            WindowsRuntimeMarshal.AddEventHandler<T>((Func<T, EventRegistrationToken>)eventBinding.addMethod, (Action<EventRegistrationToken>)eventBinding.removeMethod, (T)eventBinding.handler);
        }

        public static void RemoveHandler<T>(DependencyObject d, EventBinding eventBinding, EventInfo runtimeEvent)
        {
            if (eventBinding.handler != null)
                WindowsRuntimeMarshal.RemoveEventHandler<T>((Action<EventRegistrationToken>)eventBinding.removeMethod, (T)eventBinding.handler);
        }
    }

    public sealed class EventBinding : DependencyObject
    {
        public static readonly DependencyProperty EventProperty = DependencyProperty.Register("Event", typeof(string), typeof(EventBinding), new PropertyMetadata(null));
        public static readonly DependencyProperty MethodProperty = DependencyProperty.Register("Method", typeof(string), typeof(EventBinding), new PropertyMetadata(null));

        internal object handler;
        internal object addMethod;
        internal object removeMethod;

        public string Event
        {
            get { return (string)GetValue(EventProperty); }
            set { SetValue(EventProperty, value); }
        }

        public string Method
        {
            get { return (string)GetValue(MethodProperty); }
            set { SetValue(MethodProperty, value); }
        }

        public void Invoked<T>(object sender, T e)
        {
            var fe = sender as FrameworkElement;
            if (fe != null && fe.DataContext != null)
            {
                var methods = fe.DataContext.GetType().GetRuntimeMethods();
                var targetMethod = methods.Where(m => m.Name == Method).FirstOrDefault(m =>
                {
                    var parameters = m.GetParameters();
                    return parameters != null && parameters.Length == 2 && parameters[0].ParameterType == typeof(object) && parameters[1].ParameterType == typeof(T);
                });

                if (targetMethod != null)
                    targetMethod.Invoke(fe.DataContext, new[] { sender, e });
            }
        }
    }

    public sealed class EventBindingCollection : List<EventBinding>
    {
    }
}