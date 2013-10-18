using System;
using Vidyano.Common;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Controls
{
    public abstract class PersistentObjectAttributeControlBase : Control
    {
        #region ValidationErrors

        public static readonly DependencyProperty HookDatavalidationStatesProperty = DependencyProperty.RegisterAttached("HookDatavalidationStates", typeof(bool), typeof(PersistentObjectAttributeControlBase), new PropertyMetadata(false, HookDatavalidationStates_Changed));
        private static readonly DependencyProperty DataValidationExtensionProperty = DependencyProperty.RegisterAttached("DataValidationExtension", typeof(DataValidationExtension), typeof(PersistentObjectAttributeControlBase), new PropertyMetadata(null));

        public static bool GetHookDatavalidationStates(DependencyObject obj)
        {
            return (bool)obj.GetValue(HookDatavalidationStatesProperty);
        }

        public static void SetHookDatavalidationStates(DependencyObject obj, bool value)
        {
            obj.SetValue(HookDatavalidationStatesProperty, value);
        }

        private static void HookDatavalidationStates_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var fe = sender as FrameworkElement;
            if (fe != null)
            {
                if ((bool)e.NewValue)
                    fe.SetValue(DataValidationExtensionProperty, new DataValidationExtension(fe));
                else
                {
                    var old = e.OldValue as IDisposable;
                    if (old != null)
                        old.Dispose();

                    fe.SetValue(DataValidationExtensionProperty, DependencyProperty.UnsetValue);
                }
            }
        }

        class DataValidationExtension : NotifyableBase, IDisposable
        {
            private readonly FrameworkElement target;
            private PersistentObjectAttribute attribute;

            public DataValidationExtension(FrameworkElement target)
            {
                this.target = target;
                target.Loaded += Target_Loaded;
                target.Unloaded += Target_Unloaded;
            }

            private void Target_Loaded(object sender, RoutedEventArgs e)
            {
                attribute = target.DataContext as PersistentObjectAttribute;
                if (attribute != null)
                {
                    SetValidationErrorStyle(attribute.HasValidationError);
                    attribute.PropertyChanged += Attribute_PropertyChanged;
                }
            }

            private void Target_Unloaded(object sender, RoutedEventArgs e)
            {
                Dispose();
            }

            private void Attribute_PropertyChanged(object sender, System.ComponentModel.PropertyChangedEventArgs e)
            {
                if (e.PropertyName == "HasValidationError")
                    SetValidationErrorStyle(attribute.HasValidationError);
            }

            private void SetValidationErrorStyle(bool hasValidationError)
            {
                VisualStateManager.GoToState(target as Control, hasValidationError ? "DataValidationError" : "NoDataValidationError", true);
            }

            public void Dispose()
            {
                if (attribute != null)
                {
                    attribute.PropertyChanged -= Attribute_PropertyChanged;
                    attribute = null;
                }
            }
        }

        #endregion

        private static readonly DependencyProperty IsRequiredProperty = DependencyProperty.Register("IsRequired", typeof(bool), typeof(PersistentObjectAttributeControlBase), new PropertyMetadata(false, IsRequiredOrValueChanged));
        private static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(object), typeof(PersistentObjectAttributeControlBase), new PropertyMetadata(null, IsRequiredOrValueChanged));

        protected PersistentObjectAttributeControlBase()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeControlBase);

            SetHookDatavalidationStates(this, true);

            SetBinding(IsRequiredProperty, new Binding { Path = new PropertyPath("IsRequired") });
            SetBinding(ValueProperty, new Binding { Path = new PropertyPath("Value") });

            Loaded += PersistentObjectAttributeControlBase_Loaded;
        }

        private void PersistentObjectAttributeControlBase_Loaded(object sender, RoutedEventArgs e)
        {
            VisualStateManager.GoToState(this, Attribute != null && !Attribute.IsRequired && Attribute.Value != null ? "ButtonVisible" : "ButtonCollapsed", false);
        }

        protected override void OnGotFocus(RoutedEventArgs e)
        {
            base.OnGotFocus(e);
            VisualStateManager.GoToState(this, "Focused", false);
        }

        protected override void OnLostFocus(RoutedEventArgs e)
        {
            base.OnLostFocus(e);
            VisualStateManager.GoToState(this, "UnFocused", false);
        }

        protected override void OnPointerEntered(Windows.UI.Xaml.Input.PointerRoutedEventArgs e)
        {
            base.OnPointerEntered(e);
            VisualStateManager.GoToState(this, "PointerOver", false);
        }

        protected override void OnPointerExited(Windows.UI.Xaml.Input.PointerRoutedEventArgs e)
        {
            base.OnPointerExited(e);
            VisualStateManager.GoToState(this, "Normal", false);
        }

        protected PersistentObjectAttribute Attribute
        {
            get
            {
                return (PersistentObjectAttribute)DataContext;
            }
        }

        protected override void OnTapped(Windows.UI.Xaml.Input.TappedRoutedEventArgs e)
        {
            Focus(FocusState.Pointer);
            base.OnTapped(e);
        }

        protected virtual void OnIsRequiredOrValueChanged(bool newValue)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null)
                VisualStateManager.GoToState(this, attr.Value != null && newValue ? "ButtonVisible" : "ButtonCollapsed", false);
        }

        private static void IsRequiredOrValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var ctrl = d as PersistentObjectAttributeControlBase;
            if (ctrl != null)
            {
                var attr = ctrl.DataContext as PersistentObjectAttribute;
                if (attr != null)
                    ctrl.OnIsRequiredOrValueChanged(attr.IsRequired);
            }
        }
    }
}